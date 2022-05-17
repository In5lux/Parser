import axios from 'axios';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';

const parserRosatom = () => {
	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 1_000_000;
	const customer = args.c?.toLowerCase();
	const year = args.y;
	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	// Формат — node -s "цена контракта (число)" -y "год публикации закупки (гггг)"



	class UrlEncode {
		constructor(query) {
			this.query = query;
			this.url = `https://zakupki.rosatom.ru/Web.aspx?node=currentorders&ot=${encodeURIComponent(
				this.query,
			)}&tso=1&tsl=1&sbflag=0&pricemon=0&ostate=P&pform=a`;
		}
	}

	const queries = [
		'Деловых поездок',
		'Проездных документов',
		'Служебных поездок',
		'Авиабилетов',
		'Авиационных билетов',
		'Железнодорожных билетов',
		'Служебных командировок',
		'Командированию сотрудников',
		'Командирований',
		'Оказание услуг по организации командирования',
		'Транспортного обслуживания',
		'Протокольных мероприятий',
	];

	let parseResults = [];

	console.log('Rosatom: результаты поиска');

	const parseData = (html, minPrice, query) => {
		let data = [];
		const $ = cheerio.load(html);

		$('.table-lots-list>table>tbody>tr').each((i, elem) => {
			const result = {
				number: $(elem).find('td.description>p:first-child').text().trim(),
				customer: $(elem).find('td:nth-child(5)>p').text().trim(),
				description: $(elem).find('td.description>p:nth-child(2)>a').text().replace(/\n/g, ' '),
				price: $(elem).find('tr td:nth-child(4)>p:first-child').text().trim(),
				published: $(elem).find('td:nth-child(6)>p').text().trim(),
				end: $(elem).find('td:nth-child(7)>p').text().replace(/\s{2,}/gm, ' '),
				link: 'https://zakupki.rosatom.ru' + $(elem).find('td.description>p:nth-child(2)>a').attr('href'),
			};

			const yearPublished = result.published.split('.')[2];


			if (
				parseResults.filter((parseResult) => parseResult.link == result.link).length == 0 &&
				!!result.number
				//Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
			) {
				if (yearPublished == year || date === '*' || result.published === date) {
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

		console.log(
			data.length > 0
				? data
				: `Rosatom — нет результатов на дату ${year ? year : date} с минимальной ценой контракта ${minPrice} по запросу «${query}»`,
		);
	};

	const getData = (query) => {
		const url = new UrlEncode(query).url;
		axios
			.get(url)
			.then((res) => {
				parseData(res.data, minPrice, query);
			})
			.catch((err) => console.log('Rosatom — ' + query + ' — ' + err.message));
	};

	queries.forEach((query) => getData(query));

};

export { parserRosatom }