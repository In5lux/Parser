import axios from 'axios';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';

export const parserZakupkiGov = () => {
	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 300_000;

	const customer = args.c;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)" -c "наименование заказчика"

	class UrlEncode {
		constructor(query) {
			this.query = query;
			this.url = `https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=${encodeURIComponent(
				this.query,
			)}&morphology=on&search-filter=%D0%94%D0%B0%D1%82%D0%B5+%D1%80%D0%B0%D0%B7%D0%BC%D0%B5%D1%89%D0%B5%D0%BD%D0%B8%D1%8F&pageNumber=1&sortDirection=false&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&currencyIdGeneral=-1`;
		}
	}

	const urls = args.q
		? [[args.q, new UrlEncode(args.q).url]]
		: [
			[
				'Оказания услуг по бронированию, оформлению, продаже, обмену и возврату авиабилетов',
				new UrlEncode(
					'оказания услуг по бронированию, оформлению, продаже, обмену и возврату авиабилетов',
				).url,
			],
			['Организация командировок', new UrlEncode('организация командировок').url],
			['Организация деловых поездок', new UrlEncode('организация деловых поездок').url],
			['Служебных поездок', new UrlEncode('cлужебных поездок').url],
			['Выдворение', new UrlEncode('выдворение').url],
			['Проездных документов ', new UrlEncode('проездных документов ').url],
			['Бронирование билетов', new UrlEncode('бронирование билетов').url],
			['Оформление авиабилетов', new UrlEncode('оформление авиабилетов').url],
			['Служебных командирований', new UrlEncode('служебных командирований').url],
			['Служебных командировок', new UrlEncode('служебных командировок').url],
			['Гостиничные услуги', new UrlEncode('гостиничные услуги').url],
			['Проживание экипажей', new UrlEncode('проживание экипажей').url],
			['Обеспечение авиабилетами', new UrlEncode('обеспечение авиабилетами').url],
			['Обеспечение авиационными билетами', new UrlEncode('обеспечение авиационными билетами').url],
			[
				'Бронирование мест на авиарейсы, оформлению и продаже авиабилетов',
				new UrlEncode('бронированию мест на авиарейсы, оформлению и продаже авиабилетов').url,
			],
			[
				'Пассажирские авиаперевозки иностранных граждан',
				new UrlEncode('пассажирские авиаперевозки иностранных граждан').url,
			],
			[
				'Оказание услуг связанных с бронированием',
				new UrlEncode('оказание услуг связанных с бронированием').url,
			],
			[
				'Оказание услуг по реализации авиа, ж/д билетов',
				new UrlEncode('оказание услуг по реализации авиа, ж/д билетов').url,
			],
			[
				'Оказание услуг по организации командирования',
				new UrlEncode('организации командирования').url,
			],
			// ['Деловых мероприятий', new UrlEncode('деловых мероприятий').url],
			// ['Протокольных мероприятий', new UrlEncode('протокольных мероприятий').url],
		];

	let parseResults = [];

	console.log(
		customer
			? `Zakupki.gov: Результаты поиска по наименованию заказчика «${customer}»`
			: 'Zakupki.gov: Результаты поиска по всем заказчикам',
	);

	console.log(
		`Результаты на ${date === '*' ? 'все опубликованные активные закупки' : date
		} с минимальной суммой контракта ${minPrice}`,
	);


	const parseData = (html, minPrice) => {
		let data = [];
		const $ = cheerio.load(html);

		$('.search-registry-entry-block').each((i, elem) => {
			const result = {
				number: $(elem).find('.registry-entry__header-mid__number a').text().trim(),
				type: $(elem).find('.registry-entry__header-top__title').text().replace(/\s{2,}/g, ' ').trim(),
				customer: $(elem).find('.registry-entry__body-href a').text().trim(),
				description: $(elem).find('.registry-entry__body-value').text().replace(/\n/g, ''),
				price: $(elem).find('.price-block .price-block__value').text().trim(),
				published: $(elem).find('.col-6:first-child .data-block__value').text(),
				end: $(elem).find('.data-block > .data-block__value').text(),
				link: 'https://zakupki.gov.ru' + $(elem).find('.registry-entry__header-mid__number a').attr('href'),
			};
			result.documents = result.link.replace('common-info', 'documents');

			if (
				!parseResults.filter((parseResult) => parseResult.link == result.link).length
				//Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
			) {
				if (result.published == date || date == '*') {
					//Фильтр по дате, если дата не указана выводятся все даты
					const isCustomer = args.c
						? result.customer.toLowerCase().replaceAll('"', '').match(args.c)
						: undefined;
					if (isCustomer || args.c === undefined) {
						//Фильтр по наименованию клиента
						data.push(result);
					}
				}
			}

			parseResults.push(result);

			data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
		});
		console.log(data.length > 0 ? data : 'Нет результатов удовлетворяющих критериям поиска');
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
						`\nКоличество страниц по запросу "${url[0]}" — 1` + `\nСтраница 1 по запросу ${url[0]}`,
					);
					parseData(res.data, minPrice);
				} else {
					for (let i = 1; i <= pages; i++) {
						let newUrl = url[1].replace(/pageNumber=\d/, `pageNumber=${i}`);

						axios.get(newUrl).then((res) => {
							console.log(
								`\nКоличество страниц по запросу "${url[0]}" — ${pages}` +
								`\nСтраница ${i} по запросу ${url[0]}`,
							);
							parseData(res.data, minPrice);
						});
					}
				}
			})
			.catch((err) => console.log(err));
	};

	urls.forEach((url) => getData(url));
};

parserZakupkiGov();