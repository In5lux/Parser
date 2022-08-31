import axios from 'axios';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { myEmitter } from '../index.js'

const parserZakazRF = () => {

	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 300_000;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	const customer = args.c?.toLowerCase();

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

	class UrlEncode {
		constructor(query) {
			this.query = query;
			this.url = `http://zakazrf.ru/NotificationEx/Index?Filter=1&OrderName=${encodeURIComponent(
				this.query,
			)}&ExpandFilter=1`;
		}
	}

	const queries = args.q
		? [args.q]
		: [
			'Оказания услуг по бронированию, оформлению, продаже, обмену и возврату авиабилетов',
			'Организация командировок',
			'Организация деловых поездок',
			'Служебных поездок',
			'Выдворение',
			'Проездных документов ',
			'Бронирование билетов',
			'Оформление авиабилетов',
			'Авиационных билетов',
			'Организации воздушных перевозок',
			'Перевозкам воздушным транспортом',
			'Железнодорожных билетов',
			'Служебных командировок',
			'Служебных командирований',
			'Служебных командировок',
			'Обеспечение авиабилетами',
			'Обеспечение авиационными билетами',
			'Бронирование мест на авиарейсы, оформлению и продаже авиабилетов',
			'Пассажирские авиаперевозки иностранных граждан',
			'Оказание услуг связанных с бронированием',
			'Оказание услуг по реализации авиа, ж/д билетов',
			'Оказание услуг по организации командирования',
			'Деловых мероприятий',
			'Протокольных мероприятий',
			'Билетного аутсорсинга'
		];

	let countQueries = queries.length;

	let parseResults = [];

	console.log(
		`\nZakazRF: Результаты на ${date === '*' ? 'все опубликованные закупки' : date
		} с минимальной суммой контракта ${minPrice}\n`,
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
							? result.customer.toLowerCase().replaceAll('"', '').match(customer)
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
			if (data.length > 0) {
				console.log(data);
			} else {
				console.log(`ZakazRF — Нет результатов удовлетворяющих критериям поиска на ${date} цена ${minPrice} по запросу "${query}" (${countQueries})\n`);
			}
		}
	};

	const getData = (query) => {
		const url = new UrlEncode(query).url;
		axios
			.get(url)
			.then((res) => {
				parseData(res.data, minPrice, query);
			})
			.catch((err) => {
				console.log(`ZakazRF — ${query} (${countQueries}) — ${err.message}`);
			})
			.finally(() => {
				countQueries--;
				if (countQueries == 0) {
					setTimeout(() => {
						myEmitter.emit('next');
					}, 3000);
				}
			});
	};

	for (let query of queries) {
		getData(query)
	};
};

export { parserZakazRF }
