import axios from 'axios';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';

export const parserZakazRF = () => {
	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 300_000;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

	class UrlEncode {
		constructor(query) {
			this.query = query;
			this.url = `http://zakazrf.ru/NotificationEx/Index?Filter=1&OrderName=${encodeURIComponent(
				this.query,
			)}&ExpandFilter=1`;
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
			['Деловых мероприятий', new UrlEncode('деловых мероприятий').url],
			['Протокольных мероприятий', new UrlEncode('протокольных мероприятий').url],
		];

	let parseResults = [];

	console.log(
		`ZakazRF: Результаты на ${date === '*' ? 'все опубликованные закупки' : date
		} с минимальной суммой контракта ${minPrice}`,
	);

	const parseData = (html, minPrice, query) => {
		let data = [];
		const $ = cheerio.load(html);
		let isNotExist = false;

		$('.reporttable tr:not(:first-child)').each((i, elem) => {
			isNotExist = $(elem).find('td').text().trim() === '(нет данных)';
			if (isNotExist) {
				console.log(`Нет доступных результатов по ключевому запросу "${query}"\n`);
			} else {
				const result = {
					number: $(elem).find('td:nth-child(2)').text(),
					type: $(elem).find('td:first-child').text(),
					customer: $(elem).find('td:nth-child(8)').text(),
					description: $(elem).find('td:nth-child(5)').text(),
					price: $(elem).find('td:nth-child(6)').text() + ' руб.',
					published: $(elem).find('td:nth-child(10)').text(),
					end: $(elem).find('td:nth-child(12)').text(),
					link: 'http://zakazrf.ru' + $(elem).find('td:nth-child(2)>a').attr('href'),
				};

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
			}
		});
		if (!isNotExist) {
			console.log(
				data.length > 0
					? data
					: `Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query}"\n`,
			);
		}
	};

	const getData = (url) => {
		axios
			.get(url[1])
			.then((res) => {
				parseData(res.data, minPrice, url[0]);
			})
			.catch((err) => console.log(err));
	};

	urls.forEach((url) => getData(url));
};

parserZakazRF();