import axios from 'axios';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { dateFormat } from '../helpers/dateFormater.js';

const parserFabrikant = () => {

	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 300000;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	const active = args.a ? 0 : 1;

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

	const urls = args.q
		? [[args.q, new UrlEncode(args.q, active).url]]
		: [
			[
				'Оказания услуг по бронированию, оформлению, продаже, обмену и возврату авиабилетов',
				new UrlEncode(
					'оказания услуг по бронированию, оформлению, продаже, обмену и возврату авиабилетов', active
				).url,
			],
			['Организация командировок', new UrlEncode('организация командировок', active).url],
			['Организация деловых поездок', new UrlEncode('организация деловых поездок', active).url],
			['Служебных поездок', new UrlEncode('cлужебных поездок', active).url],
			['Выдворение', new UrlEncode('выдворение', active).url],
			['Проездных документов ', new UrlEncode('проездных документов', active).url],
			['Бронирование билетов', new UrlEncode('бронирование билетов', active).url],
			['Оформление авиабилетов', new UrlEncode('оформление авиабилетов', active).url],
			['Служебных командирований', new UrlEncode('служебных командирований', active).url],
			['Служебных командировок', new UrlEncode('служебных командировок', active).url],
			['Гостиничные услуги', new UrlEncode('гостиничные услуги', active).url],
			['Проживание экипажей', new UrlEncode('проживание экипажей', active).url],
			['Обеспечение авиабилетами', new UrlEncode('обеспечение авиабилетами', active).url],
			['Обеспечение авиационными билетами', new UrlEncode('обеспечение авиационными билетами', active).url],
			[
				'Бронирование мест на авиарейсы, оформлению и продаже авиабилетов',
				new UrlEncode('бронированию мест на авиарейсы, оформлению и продаже авиабилетов', active).url,
			],
			[
				'Пассажирские авиаперевозки иностранных граждан',
				new UrlEncode('пассажирские авиаперевозки иностранных граждан', active).url,
			],
			[
				'Оказание услуг связанных с бронированием',
				new UrlEncode('оказание услуг связанных с бронированием', active).url,
			],
			[
				'Оказание услуг по реализации авиа, ж/д билетов',
				new UrlEncode('оказание услуг по реализации авиа, ж/д билетов', active).url,
			],
			[
				'Оказание услуг по организации командирования',
				new UrlEncode('организации командирования', active).url,
			],
			['Деловых мероприятий', new UrlEncode('деловых мероприятий', active).url],
			['Протокольных мероприятий', new UrlEncode('протокольных мероприятий', active).url],
		];

	let parseResults = [];

	const parseData = (html, minPrice, query) => {
		let data = [];
		const $ = cheerio.load(html);

		const isNotExsist = $('.Search-result-no')['0']?.name === 'div'

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
					published: $(elem).find('.marketplace-unit__state:first-child .dt').text(),
					end: $(elem).find('.marketplace-unit__state:last-child .dt').text(),
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
				data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
			});
		}


		console.log(
			data.length > 0
				? data
				: `Fabrikant — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query}"\n`,
		);
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
}


export { parserFabrikant }