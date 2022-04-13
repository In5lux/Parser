const axios = require('axios');
const cheerio = require('cheerio');

const minPrice = 10_000_000;

class UrlEncode {
	constructor(query) {
		this.query = query;
		this.url = `https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=${encodeURIComponent(
			this.query
		)}&morphology=on&search-filter=%D0%94%D0%B0%D1%82%D0%B5+%D1%80%D0%B0%D0%B7%D0%BC%D0%B5%D1%89%D0%B5%D0%BD%D0%B8%D1%8F&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&currencyIdGeneral=-1`;
	}
}

const urls = [
	['Организация командировок', new UrlEncode('организация командировок').url],
	['Организация деловых поездок', new UrlEncode('организация деловых поездок').url],
	['Служебных поездок', new UrlEncode('cлужебных поездок').url],
	['Выдворение', new UrlEncode('выдворение').url],
	['Бронирование билетов', new UrlEncode('бронирование билетов').url],
	['Оформление авиабилетов', new UrlEncode('оформление авиабилетов').url],
	['Служебных командирований', new UrlEncode('служебных командирований').url],
	['Служебных командировок', new UrlEncode('служебных командировок').url],
];

let parseResults = [];

const parseData = (html, minPrice) => {
	let data = [];
	const $ = cheerio.load(html);

	$('.search-registry-entry-block').each((i, elem) => {
		const result = {
			number: $(elem)
				.find('.registry-entry__header-mid__number a')
				.text()
				.trim(),
			type: $(elem)
				.find('.registry-entry__header-top__title')
				.text()
				.replace(/\s{2,}/g, ' ')
				.trim(),
			customer: $(elem)
				.find('.registry-entry__body-href a')
				.text()
				.trim(),
			description: $(elem)
				.find('.registry-entry__body-value')
				.text()
				.replace(/\n/g, ''),
			price: $(elem)
				.find('.price-block .price-block__value')
				.text()
				.trim(),
			published: $(elem)
				.find('.col-6:first-child .data-block__value')
				.text(),
			end: $(elem).find('.data-block > .data-block__value').text(),
			link:
				'https://zakupki.gov.ru' +
				$(elem)
					.find('.registry-entry__header-mid__number a')
					.attr('href'),
		};
		result.documents = result.link.replace('common-info', 'documents');
		if (
			!parseResults.filter(
				(parseResult) => parseResult.link == result.link
			).length
		) {
			data.push(result);
		} //Проверка на дубли результатов парсинга по разным поисковым запросам

		parseResults.push(result);
		data = data.filter(
			(item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice
		);
	});
	console.log(
		data.length > 0
			? data
			: 'Нет результатов удовлетворяющих минимальной цене контракта'
	);
};

const countPages = (html, url) => {
	const $ = cheerio.load(html);
	const pages = $('.paginator .page').length;
	return pages;
};

const getData = (url) => {
	axios
		.get(url[1])
		.then((res) => {
			const pages = countPages(res.data, url);
			if (!pages) {
				console.log(
					`\nКоличество страниц по запросу "${url[0]}" — 1` +
					`\nСтраница 1 по запросу ${url[0]}`
				);
				parseData(res.data, minPrice);
			} else {
				for (let i = 1; i <= pages; i++) {
					let newUrl = url[1].replace(
						/pageNumber=\d/,
						`pageNumber=${i}`
					);
					//console.log(`НОВАЯ ССЫЛКА  ${newUrl}`);
					axios.get(newUrl).then((res) => {
						console.log(
							`\nКоличество страниц по запросу "${url[0]}" — ${pages}` +
							`\nСтраница ${i} по запросу ${url[0]}`
						);
						parseData(res.data, minPrice);
					});
				}
			}
		})
		.catch((err) => console.log(err));
};

urls.forEach((url) => getData(url));
