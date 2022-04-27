import axios from 'axios';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';

export const parserEtpEts = () => {

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

parserEtpEts();