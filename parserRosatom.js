import axios from 'axios';
import cheerio from 'cheerio';
import { getArgs } from './helpers/args.js';

const args = getArgs(process.argv);

const minPrice = args.s ? args.s : 1_000_000;
const year = args.y ? args.y : new Date().getFullYear();

// Формат — node -s "цена контракта (число)" -y "год публикации закупки (гггг)"

class UrlEncode {
	constructor(query) {
		this.query = query;
		this.url = `https://zakupki.rosatom.ru/Web.aspx?node=currentorders&ot=${encodeURIComponent(
			this.query
		)}&tso=1&tsl=1&sbflag=0&pricemon=0&ostate=P&pform=a`;
	}
}

const urls = [
	['Деловых поездок', new UrlEncode('деловых поездок').url],
	['Служебных командировок', new UrlEncode('служебных командировок').url],
	['Оказание услуг по организации командирования', new UrlEncode('организации командирования').url],
	['Транспортного обслуживания', new UrlEncode('транспортного обслуживания').url],
	['Протокольных мероприятий', new UrlEncode('протокольных мероприятий').url],
];

let parseResults = [];

const parseData = (html, minPrice, query) => {
	let data = [];
	const $ = cheerio.load(html);

	$('.table-lots-list>table>tbody>tr').each((i, elem) => {
		const result = {
			number: $(elem).find('td.description>p:first-child').text().trim(),
			customer: $(elem).find('td:nth-child(5)>p').text().trim(),
			description: $(elem)
				.find('td.description>p:nth-child(2)>a')
				.text()
				.replace(/\n/g, ' '),
			price: $(elem)
				.find('tr td:nth-child(4)>p:first-child')
				.text()
				.trim(),
			published: $(elem).find('td:nth-child(6)>p').text().trim(),
			end: $(elem)
				.find('td:nth-child(7)>p')
				.text()
				.replace(/\s{2,}/gm, ' '),
			link:
				'https://zakupki.rosatom.ru' +
				$(elem).find('td.description>p:nth-child(2)>a').attr('href'),
		};

		const yearPublished = result.published.split('.')[2];

		if (
			!parseResults.filter((parseResult) => {
				parseResult.link == result.link;
			}).length &&
			!!result.number &&
			yearPublished == year
		) {
			data.push(result);
		} //Проверка на дубли результатов парсинга по разным поисковым запросам

		parseResults.push(result);
		data = data.filter(
			(item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice
		);
	});

	console.log(
		data.length > 0
			? data
			: `Нет результатов удовлетворяющих минимальной цене контракта по запросу «${query}»`
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
