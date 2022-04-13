const axios = require('axios');
const cheerio = require('cheerio');

const minPrice = 10_000_000;

const urls = [
	[
		'Организация командировок',
		'https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=%D0%BE%D1%80%D0%B3%D0%B0%D0%BD%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F+%D0%BA%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D0%B8%D1%80%D0%BE%D0%B2%D0%BE%D0%BA&morphology=on&search-filter=%D0%94%D0%B0%D1%82%D0%B5+%D1%80%D0%B0%D0%B7%D0%BC%D0%B5%D1%89%D0%B5%D0%BD%D0%B8%D1%8F&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&currencyIdGeneral=-1',
	],
	[
		'Организация деловых поездок',
		'https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=%D0%BE%D1%80%D0%B3%D0%B0%D0%BD%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F+%D0%B4%D0%B5%D0%BB%D0%BE%D0%B2%D1%8B%D1%85+%D0%BF%D0%BE%D0%B5%D0%B7%D0%B4%D0%BE%D0%BA&morphology=on&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&currencyIdGeneral=-1',
	],
	[
		'Служебных поездок',
		'https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=%D1%81%D0%BB%D1%83%D0%B6%D0%B5%D0%B1%D0%BD%D1%8B%D1%85+%D0%BF%D0%BE%D0%B5%D0%B7%D0%B4%D0%BE%D0%BA&morphology=on&search-filter=%D0%94%D0%B0%D1%82%D0%B5+%D1%80%D0%B0%D0%B7%D0%BC%D0%B5%D1%89%D0%B5%D0%BD%D0%B8%D1%8F&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&currencyIdGeneral=-1',
	],
	[
		'Выдворение',
		'https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=%D0%B2%D1%8B%D0%B4%D0%B2%D0%BE%D1%80%D0%B5%D0%BD%D0%B8%D0%B5&morphology=on&search-filter=%D0%94%D0%B0%D1%82%D0%B5+%D1%80%D0%B0%D0%B7%D0%BC%D0%B5%D1%89%D0%B5%D0%BD%D0%B8%D1%8F&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&currencyIdGeneral=-1',
	],
	[
		'Бронирование билетов',
		'https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=%D0%B1%D1%80%D0%BE%D0%BD%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5+%D0%B1%D0%B8%D0%BB%D0%B5%D1%82%D0%BE%D0%B2&morphology=on&search-filter=%D0%94%D0%B0%D1%82%D0%B5+%D1%80%D0%B0%D0%B7%D0%BC%D0%B5%D1%89%D0%B5%D0%BD%D0%B8%D1%8F&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&savedSearchSettingsIdHidden=&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&placingWayList=&selectedLaws=&priceFromGeneral=&priceFromGWS=&priceFromUnitGWS=&priceToGeneral=&priceToGWS=&priceToUnitGWS=&currencyIdGeneral=-1&publishDateFrom=&publishDateTo=&applSubmissionCloseDateFrom=&applSubmissionCloseDateTo=&customerIdOrg=&customerFz94id=&customerTitle=&okpd2Ids=&okpd2IdsCodes=',
	],
	[
		'Оформление авиабилетов',
		'https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=%D0%BE%D1%84%D0%BE%D1%80%D0%BC%D0%BB%D0%B5%D0%BD%D0%B8%D1%8E+%D0%B0%D0%B2%D0%B8%D0%B0%D0%B1%D0%B8%D0%BB%D0%B5%D1%82%D0%BE%D0%B2&morphology=on&search-filter=%D0%94%D0%B0%D1%82%D0%B5+%D1%80%D0%B0%D0%B7%D0%BC%D0%B5%D1%89%D0%B5%D0%BD%D0%B8%D1%8F&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&currencyIdGeneral=-1',
	],
	[
		'Служебных командирований',
		'https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=%D1%81%D0%BB%D1%83%D0%B6%D0%B5%D0%B1%D0%BD%D1%8B%D1%85+%D0%BA%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9&morphology=on&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&currencyIdGeneral=-1',
	],
	[
		'Служебных командировок',
		'https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=%D1%81%D0%BB%D1%83%D0%B6%D0%B5%D0%B1%D0%BD%D1%8B%D1%85+%D0%BA%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9&morphology=on&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&currencyIdGeneral=-1',
	],
];

let parseResults = [];

const parseData = (html, minPrice) => {
	let data = [];
	const $ = cheerio.load(html);

	$('.search-registry-entry-block').each((i, elem) => {
		const result = {
			N: $(elem)
				.find('.registry-entry__header-mid__number a')
				.text()
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

// setTimeout(() => {
// 	console.log('--------------------------------------------');
// 	console.log(parseResults);
// }, 5000);
