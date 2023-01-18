import axios from 'axios';
import * as cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { bot, myEmitter, db, dbPath } from '../index.js';
import { writeFileSync } from 'fs';
import { isNew } from '../helpers/isNew.js';
import { priceFilter } from '../helpers/priceFilter.js';
import { searchParams } from '../main.js';

const parserEtpEts = () => {

	let delay = 0;

	const args = getArgs(argv);

	const minPrice = args.s || searchParams?.price || 300_000;

	const date = searchParams?.date || args.d || format(new Date(), 'dd.MM.yyyy');

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

	class UrlEncode {
		constructor(query) {
			this.url = `https://etp-ets.ru/44/catalog/procedure?q=${encodeURIComponent(query)}&simple-search=${encodeURIComponent('Искать')}`;
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
			'Перевозок департируемых',
			'Проездных документов ',
			// 'Бронирование билетов',
			'Оформление авиабилетов',
			'Авиационных билетов',
			'Организации воздушных перевозок',
			'Перевозкам воздушным транспортом',
			'Железнодорожных билетов',
			'Служебных командировок',
			'Командированию сотрудников',
			'Гостиничные услуги',
			'Проживание экипажей',
			'Обеспечение авиабилетами',
			'Обеспечение авиационными билетами',
			'Бронирование мест на авиарейсы, оформлению и продаже авиабилетов',
			'Пассажирские авиаперевозки иностранных граждан',
			'Оказание услуг связанных с бронированием',
			'Оказание услуг по реализации авиа, ж/д билетов',
			'Оказание услуг по организации командирования'
		];

	let countQueries = queries.length;

	const parseResults = [];

	console.log(
		`\nEtp Ets 44 — Результаты на ${date === '*' ? 'все опубликованные закупки' : date
		} с минимальной суммой контракта ${minPrice}\n`
	);

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
					end: $(elem).find('td.row-request_end_give_datetime').text()?.trim() || '—',
					link: $(elem).find('td.row-procedure_name a').attr('href'),
					documents: $(elem).find('td.row-procedure_name a').attr('href')?.replace('procedure', 'documentation')
				};

				if (
					!parseResults.filter((parseResult) => parseResult.link == result.link).length
					// Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
				) {
					if (result.published == date || date == '*') {
						// Фильтр по дате, если дата не указана выводятся все даты
						const isCustomer = args.c
							? result.customer.toLowerCase().replaceAll('"', '').match(args.c.toLowerCase())
							: undefined;
						if (isCustomer || args.c === undefined && priceFilter(result.price, minPrice)) {
							// Фильтр по наименованию клиента
							data.push(result);
							if (isNew(db, result.number)) {
								db.push(result);
								writeFileSync(dbPath, JSON.stringify(db));
								const message = `*Номер закупки:* ${result.number}\n\n`
									+ `*Статус:* ${result.status}\n\n`
									+ `*Тип закупки:* ${result.type}\n\n`
									+ `*Клиент:* ${result.customer}\n\n`
									+ `*Описание:* ${result.description}\n\n`
									+ `*Цена:* ${result.price}\n\n`
									+ `*Дата публикации:* ${result.published}\n\n`
									+ `*Окончание:* ${result.end}\n\n`
									+ `*Ссылка:* ${result.link}\n\n`
									+ `*Документы:* ${result.documents}`;

								setTimeout(() => {
									bot.telegram.sendMessage(process.env.CHAT_ID, message, { parse_mode: 'Markdown' });
								}, delay);
								delay += 1000;
							}
						}
					}
				}

				parseResults.push(result);

				//data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
			}
		});
		// console.log(`Etp Ets 44 — ${query} (${countQueries})`);
		if (!isNotExist) {
			if (data.length > 0) {
				console.log(data);
			} else {
				console.log(`Etp Ets 44 — Нет результатов удовлетворяющих критериям поиска на ${date} цена ${minPrice} по запросу "${query}" (${countQueries})\n`);
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
				console.log(`EtpEts 44 — ${query} (${countQueries}) — ${err.message}`);
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

	for (const query of queries) {
		getData(query);
	}
};

export { parserEtpEts };
