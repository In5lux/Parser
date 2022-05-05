import axios from 'axios';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';

const parserEtpEts = () => {

	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 300_000;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

	console.log(
		`Результаты на ${date === '*' ? 'все опубликованные закупки' : date
		} с минимальной суммой контракта ${minPrice}`,
	);

	class UrlEncode {
		constructor(query) {
			this.url = `https://etp-ets.ru/44/catalog/procedure?q=${encodeURIComponent(query)}`;
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
			'Железнодорожных билетов',
			'Служебных командировок',
			'Служебных командирований',
			'Служебных командировок',
			'Гостиничные услуги',
			'Проживание экипажей',
			'Обеспечение авиабилетами',
			'Обеспечение авиационными билетами',
			'Бронирование мест на авиарейсы, оформлению и продаже авиабилетов',
			'Пассажирские авиаперевозки иностранных граждан',
			'Оказание услуг связанных с бронированием',
			'Оказание услуг по реализации авиа, ж/д билетов',
			'Оказание услуг по организации командирования',
			'Деловых мероприятий',
			'Протокольных мероприятий',
		];

	let parseResults = [];

	const parseData = (html, minPrice, query) => {
		let data = [];
		const $ = cheerio.load(html);
		let isNotExist = false;

		$('table.table tbody tr').each((i, elem) => {
			isNotExist = $(elem).find('td').text().trim() === '(нет данных)';
			if (isNotExist) {
				console.log(`Нет доступных результатов по ключевому запросу "${query}"\n`);
			} else {
				const result = {
					number: $(elem).find('td.row-procedure_name').text().replace(/\D/gm, ''),
					type: $(elem).find('td.row-type').text(),
					status: $(elem).find('td.row-status').text(),
					customer: $(elem).find('td.row-customer_name').text(),
					description: $(elem).find('td.row-procedure_name a').text().replace(/\n/g, ' '),
					price: $(elem).find('td.row-contract_start_price').text(),
					published: $(elem).find('td.row-publication_datetime').text().slice(0, 10),
					end: $(elem).find('td.row-request_end_give_datetime').text(),
					link: $(elem).find('td.row-procedure_name a').attr('href'),
					documents: $(elem).find('td.row-procedure_name a').attr('href')?.replace('procedure', 'documentation'),
				}

				if (
					!parseResults.filter((parseResult) => parseResult.link == result.link).length
					//Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
				) {
					if (result.published == date || date == '*') {
						//Фильтр по дате, если дата не указана выводятся все даты
						const isCustomer = args.c
							? result.customer.toLowerCase().replaceAll('"', '').match(args.c.toLowerCase())
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
					: `Etp Ets — Нет результатов удовлетворяющих критериям поиска на ${date} цена ${minPrice} по запросу "${query}"\n`,
			);
		}
	};

	const getData = (query) => {
		const url = new UrlEncode(query).url;
		axios
			.get(url)
			.then((res) => {
				parseData(res.data, minPrice, query);
			})
			.catch((err) => console.log('EtpEts — ' + query + ' — ' + err.message));
	};

	queries.forEach((query) => getData(query));
};

export { parserEtpEts }