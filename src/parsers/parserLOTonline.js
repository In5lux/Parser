import puppeteer from 'puppeteer';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import cheerio from 'cheerio';

const parserLOTonline = () => {

	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 100_000;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	const customer = args.c?.toLowerCase();

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

	console.log(
		`Lot-online — Результаты на ${date === '*' ? 'все опубликованные закупки' : date
		} с минимальной суммой контракта ${minPrice}`,
	);

	class UrlEncode {
		constructor(query) {
			this.url = `https://gz.lot-online.ru/etp_front/procedure/list?page=1&limit=10&sort=2&sortDirection=DESC&personal=true&${args.a ? '' : 'status=given'}&keywords=${encodeURIComponent(query)}`;
		}
	}

	const queries = args.q
		? [args.q]
		: [
			'Командировок',
			'Деловых поездок',
			'Служебных поездок',
			'Проездных документов ',
			'Бронирование авиабилетов',
			'Оформление авиабилетов',
		];

	let parseResults = [];

	const parseData = async (minPrice, queries) => {
		const browser = await puppeteer.launch({
			headless: true, // false: enables one to view the Chrome instance in action
			//defaultViewport: { width: 1263, height: 930 }, // (optional)
		});

		let count = queries.length;

		for (let query of queries) {
			const url = new UrlEncode(query).url;
			const page = await browser.newPage();
			page.setDefaultNavigationTimeout(0);
			//await page.waitForTimeout(3000);
			await page.goto(url, { waitUntil: 'networkidle2' });
			//await page.setViewport({ width: 1263, height: 930 });
			// await page.waitForSelector('div.mat-expansion-panel-body div div input');
			// await page.focus('div.mat-expansion-panel-body div div input');
			// await page.waitForTimeout(1000);
			// await page.keyboard.type(query);
			// await page.click('button[type="submit"]');
			//await page.screenshot({ path: `page — ${query}.png` });
			//await page.pdf({ path: `page ${query}.pdf`, printBackground: true, width: '1263px', height: '930px' });
			const html = await page.content();

			const $ = cheerio.load(html);

			count--;
			await page.close();
			if (count == 0) await browser.close();

			let data = [];

			const isExsist = !$('body').text().includes('По вашему запросу ничего не найдено');

			if (isExsist) {
				$('.procedureList__card').each((i, elem) => {
					const result = {
						number: $(elem).find('a.__link_purchase-number').text(),
						type: $(elem).find('.card-div__procedureType').text().split(' / ')[1].trim(),
						law: $(elem).find('.card-div__procedureType').text().split(' / ')[0].trim(),
						status: $(elem).find('.card-div__procedureStatus span:nth-child(2)').text().trim(),
						customer: $(elem).find('div>div:nth-child(3)>div.col-12.col-md-8>div>div:nth-child(2)').text().trim(),
						description: $(elem).find('div>div.row.col-12.mb-2.mt-4.pl-md-0>div.col-12.col-md-8>div.row.col-12.p-md-0.mx-md-0.__purchaseObjectInfo>p').text().replace(/[\n\t]/g, ' ').trim(),
						price: $(elem).find('.card-div__maxSum').text().trim(),
						published: $(elem).find('.__publication-date').text().split(' ')[1],
						end: $(elem).find('div>div.row.col-12.mb-2.mt-4.pl-md-0>div.col-12.col-md-4.pl-md-0.card-div__procedureStatus.ng-star-inserted>span:nth-child(4)').text().split(' ')[4] || '—',
						link: 'https://gz.lot-online.ru' + $(elem).find('a.__link_purchase-number').attr('href'),
						documents: 'https://gz.lot-online.ru' + $(elem).find('a.__link_purchase-number').attr('href').replace('common', 'documentation'),
					}

					console.log(result);

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
			} else {
				console.log(`Lot-online — Нет доступных результатов по ключевому запросу "${query}"\n`);
			}
			console.log(
				data.length > 0
					? data
					: `Lot-online — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query}"\n`,
			);
		}
	};

	parseData(minPrice, queries);
}

export { parserLOTonline }