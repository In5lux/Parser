import axios from 'axios';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { options, bot, myEmitter, db, dbPath } from '../index.js';
import { writeFileSync } from 'fs';
import { isNew } from '../helpers/isNew.js';

const parserZakupkiGov = () => {

	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 300_000;

	const customer = args.c?.toLowerCase();

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)" -c "наименование заказчика" -a "все закупки, включая архивные"

	console.log(
		`\nРезультаты на ${date === '*' ? 'все опубликованные активные закупки' : date
		} с минимальной суммой контракта ${minPrice}\n`
	);

	class UrlEncode {
		constructor(query) {
			this.query = query.toLowerCase();
			this.url = `https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=${encodeURIComponent(
				this.query
			)}&morphology=on&search-filter=%D0%94%D0%B0%D1%82%D0%B5+%D1%80%D0%B0%D0%B7%D0%BC%D0%B5%D1%89%D0%B5%D0%BD%D0%B8%D1%8F&pageNumber=1&sortDirection=false&recordsPerPage=_50&showLotsInfoHidden=false&sortBy=UPDATE_DATE&fz44=on&fz223=on&af=on&currencyIdGeneral=-1`;
		}
	}

	const queries = args.q
		? [args.q]
		: [
			'Оказания услуг по бронированию, оформлению, продаже, обмену и возврату авиабилетов',
			'Организация командировок',
			'Организация деловых поездок',
			'Командировки',
			'Служебных поездок',
			'Выдворение',
			'Перевозок департируемых',
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
			'Организации воздушных перевозок',
			'Перевозкам воздушным транспортом',
			'Бронирование мест на авиарейсы, оформлению и продаже авиабилетов',
			'Пассажирские авиаперевозки иностранных граждан',
			'Оказание услуг связанных с бронированием',
			'Оказание услуг по реализации авиа, ж/д билетов',
			'Оказание услуг по организации командирования',
			'Билетного аутсорсинга',
			'Деловых мероприятий',
			'Протокольных мероприятий',
			'Безденежному оформлению и предоставлению',
			'Организации перевозок по территории РФ',
			'Транспортно экспедиторское обслуживание'
		];

	let countQueries = queries.length;

	const parseResults = [];

	console.log(customer ? `Поиск по компании «${customer[0].toUpperCase()}${customer.slice(1)}»` : 'Поиск по всем компаниям');

	const parseData = (html, minPrice, query) => {
		let data = [];
		const $ = cheerio.load(html);
		// eslint-disable-next-line no-debugger
		debugger;
		$('.search-registry-entry-block').each((i, elem) => {

			const result = {
				number: $(elem).find('.registry-entry__header-mid__number a').text().trim(),
				type: $(elem).find('.registry-entry__header-top__title').text().replace(/\s{2,}/g, ' ').trim(),
				customer: $(elem).find('.registry-entry__body-href a').text().trim(),
				description: $(elem).find('.registry-entry__body-value').text().replace(/\n/g, ''),
				price: $(elem).find('.price-block .price-block__value').text().trim(),
				published: $(elem).find('.col-6:first-child .data-block__value').text(),
				end: $(elem).find('.data-block > .data-block__value').text(),
				link: 'https://zakupki.gov.ru' + $(elem).find('.registry-entry__header-mid__number a').attr('href')
			};
			result.documents = result.link.replace('common-info', 'documents');

			if (
				parseResults.filter((parseResult) => parseResult.link == result.link).length == 0
				// Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
			) {
				if (result.published === date || date === '*') {
					// Фильтр по дате, если дата не указана выводятся все даты
					const isCustomer = customer
						? !!result.customer.toLowerCase().replaceAll('"', '').match(customer)
						: undefined;
					if (isCustomer || customer === undefined) {
						// Фильтр по наименованию клиента
						data.push(result);
						if (isNew(db, result.number)) {
							db.push(result);
							writeFileSync(dbPath, JSON.stringify(db));
							const message = `*Номер закупки:* ${result.number}\n\n`
								+ `*Тип закупки:* ${result.type}\n\n`
								+ `*Клиент:* ${result.customer}\n\n`
								+ `*Описание:* ${result.description}\n\n`
								+ `*Цена:* ${result.price}\n\n`
								+ `*Дата публикации:* ${result.published}\n\n`
								+ `*Окончание:* ${result.end}\n\n`
								+ `*Ссылка:* ${result.link}\n\n`
								+ `*Документы:* ${result.documents}`;

							bot.telegram.sendMessage(options.parsed['CHAT_ID'], message, { parse_mode: 'Markdown' });
						}
					}
				}
			}

			parseResults.push(result);

			data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
		});

		// console.log(`Zakupki Gov — ${query} (${countQueries})`);

		if (data.length) {
			console.log(data);
		} else {
			console.log(`Zakupki Gov — Нет результатов удовлетворяющих критериям поиска на ${date} с минимальной ценой ${minPrice} по запросу «${query}» (${countQueries})`);
		}
	};

	const countPages = html => {
		const $ = cheerio.load(html);
		const pages = $('.paginator .page').length;
		return pages;
	};

	const getData = (query) => {
		const url = new UrlEncode(query).url;
		axios
			.get(url)
			.then((res) => {
				const count = countQueries;
				const pages = countPages(res.data, query);
				if (!pages) {
					console.log(
						`\nZakupki Gov — Количество страниц по запросу "${query}" (${count}) — 1` + `\nСтраница 1 по запросу ${query}`
					);
					parseData(res.data, minPrice, query);
				} else {
					for (let i = 1; i <= pages; i++) {
						const newUrl = url.replace(/pageNumber=\d/, `pageNumber=${i}`);
						// console.log(`НОВАЯ ССЫЛКА  ${newUrl}`);
						axios.get(newUrl).then((res) => {
							console.log(
								`\nZakupki Gov — Количество страниц по запросу "${query}" (${count}) — ${pages}` +
								`\nСтраница ${i} по запросу ${query}`
							);
							parseData(res.data, minPrice, query);
						});
					}
				}
			})
			.catch((err) => {
				const count = countQueries;
				console.log(`\nZakupki Gov — ${query} (${count}) — ${err.message}\n`);
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

export { parserZakupkiGov };
