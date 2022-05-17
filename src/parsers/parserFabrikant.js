import axios from 'axios';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { dateFormat } from '../helpers/dateFormatter.js';

const parserFabrikant = () => {

	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 300000;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	const active = args.a ? '0' : '1'; // -a поиск по архивным закупкам

	const customer = args.c?.toLowerCase();

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

	console.log(
		`Fabrikant — Результаты на ${date === '*' ? 'все опубликованные закупки' : date
		} с минимальной суммой контракта ${minPrice}`,
	);

	class UrlEncode {
		constructor(query, active) {
			this.url = `https://www.fabrikant.ru/trades/procedure/search/?query=${encodeURIComponent(query)}&active=${active}`;
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
			'Служебных командирований',
			'Командированию сотрудников',
			'Служебных командировок',
			'Проживание экипажей',
			'Обеспечение авиабилетами',
			'Обеспечение авиационными билетами',
			'Пассажирские авиаперевозки иностранных граждан',
			'Оказание услуг связанных с бронированием',
			'Оказание услуг по организации командирования',
		];

	let parseResults = [];

	const parseData = (html, minPrice, query) => {
		let data = [];
		const $ = cheerio.load(html);

		const isNotExsist = $('.Search-result-no')['0']?.name === 'div';

		if (isNotExsist) {
			console.log(`Fabrikant — Нет доступных результатов по ключевому запросу "${query}"\n`);
		} else {
			$('.innerGrid').each((i, elem) => {
				// isNotExist = $(elem).find('td').text().trim() === '(нет данных)';

				const result = {
					number: $(elem).find('.marketplace-unit__info__name span').text().replace(/\D/gm, ''),
					type: $(elem).find('.marketplace-unit__info__name span').text().split('№')[0],
					status: $(elem).find('.bid-evt-color').text(),
					customer: $(elem).find('.marketplace-unit__organizer a span:last-child').text(),
					description: $(elem).find('.marketplace-unit__title a').text().trim(),
					price: $(elem).find('.marketplace-unit__price span strong').text().trim() || $(elem).find('.marketplace-unit__price p').text().trim() || $(elem).find('.marketplace-unit__price>span').text().trim(),
					published: $(elem).find('.marketplace-unit__state__wrap>.marketplace-unit__state:first-child .dt').text(),
					end: $(elem).find('.marketplace-unit__state__wrap>.marketplace-unit__state:last-child .dt').text(),
					link: 'https://www.fabrikant.ru' + $(elem).find('.marketplace-unit__title a').attr('href'),
				}

				result.link = result.link.includes('etp-ets') ? result.link.replace('https://www.fabrikant.ru', '') : result.link;
				result.published = dateFormat(result.published);
				result.end = dateFormat(result.end);
				result.price = result.price != 'Участие бесплатно' ? result.price : '0';

				if (
					!parseResults.filter((parseResult) => parseResult.link == result.link).length
					//Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
				) {
					if (result.published === date || date === '*') {
						//Фильтр по дате, если дата не указана выводятся все даты
						const isCustomer = customer
							? !!result.customer.toLowerCase().replaceAll('"', '').match(customer)
							: undefined;
						if (isCustomer || customer === undefined) {
							//Фильтр по наименованию клиента
							data.push(result);
						}
					}
				}
				parseResults.push(result);

				data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
			});
		}


		console.log(
			data.length > 0
				? data
				: `Fabrikant — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query}"\n`,
		);
	};

	const getData = (query) => {
		const url = new UrlEncode(query, active).url;
		axios
			.get(url)
			.then((res) => {
				parseData(res.data, minPrice, query);
			})
			.catch((err) => console.log('Fabrikant — ' + query + ' — ' + err.message));
	};

	queries.forEach((query) => getData(query));

}


export { parserFabrikant }