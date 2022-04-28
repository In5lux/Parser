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

	const urls = [
		['Деловых поездок', new UrlEncode('деловых поездок').url],
		['Проездных документов', new UrlEncode('проездных документов').url],
		['Служебных поездок', new UrlEncode('служебных поездок').url],
		['Авиабилетов', new UrlEncode('авиабилетов').url],
		['Авиационных билетов', new UrlEncode('авиационных билетов').url],
		['Железнодорожных билетов', new UrlEncode('железнодорожных билетов').url],
		['Служебных командировок', new UrlEncode('служебных командировок').url],
		['Командирований', new UrlEncode('командирований').url],
		['Оказание услуг по организации командирования', new UrlEncode('организации командирования').url],
		['Транспортного обслуживания', new UrlEncode('транспортного обслуживания').url],
		['Протокольных мероприятий', new UrlEncode('протокольных мероприятий').url],
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

	const getData = (url) => {
		axios
			.get(url[1])
			.then((res) => {
				parseData(res.data, minPrice, url[0]);
			})
			.catch((err) => console.log(err.message));
	};

	urls.forEach((url) => getData(url));
};

export { parserRosatom }