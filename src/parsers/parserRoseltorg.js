import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { myEmitter } from '../index.js'

const parserRoseltorg = () => {

	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 300_000;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

	console.log(
		`\nRoseltorg — Результаты на ${date === '*' ? 'все опубликованные закупки' : date
		} с минимальной суммой контракта ${minPrice}\n`,
	);

	class UrlEncode {
		constructor(date, query) {
			this.startPublishDate = date != '*' ? `&start_date_published=${date.substr(0, 6) + date.slice(8)}` : '';
			this.url = `https://www.roseltorg.ru/procedures/search?sale=1&query_field=${encodeURIComponent(query)}&status%5B%5D=0&currency=all${this.startPublishDate}`;
		}
	}

	const queries = args.q
		? [args.q]
		: [
			'Авиабилетов',
			'Деловых поездок',
			'Служебных поездок',
			'Выдворение',
			'Бронирование билетов',
			'Авиационных билетов',
			'Железнодорожных билетов',
			'Командировок',
			'Командирований',
			'Обеспечение авиационными билетами',
			'Авиаперевозки',
			'Билетного аутсорсинга',
			'Безденежному оформлению и предоставлению'
		];

	let parseResults = [];

	const parseData = async (date, minPrice, queries) => {
		//const browserFetcher = puppeteer.createBrowserFetcher();
		//const revisionInfo = await browserFetcher.download('991974');

		const browser = await puppeteer.launch({
			//executablePath: revisionInfo.executablePath,
			headless: true, // false: enables one to view the Chrome instance in action
			//defaultViewport: { width: 1263, height: 930 }, // optional
			slowMo: 25
		});

		let count = queries.length;

		for (let query of queries) {
			const url = new UrlEncode(date, query).url;
			const page = await browser.newPage();
			page.setDefaultNavigationTimeout(0);
			//page.on('load', () => console.log('Loaded!', page.url()));
			//page.on('domcontentloaded', () => console.log('dom fired'));
			//await page.waitForTimeout(3000);
			await page.goto(url, { waitUntil: 'networkidle2' });

			//await page.screenshot({ path: `page — ${query}.png` });
			//await page.pdf({ path: `page ${query}.pdf`, printBackground: true, width: '1263px', height: '930px' });
			const html = await page.content();

			let data = [];

			const $ = cheerio.load(html);
			let isNotExist = $('.search-results__info-text p:first-child').text() == 'По вашему запросу ничего не найдено.';

			if (isNotExist) {
				console.log(`Roseltorg — Нет доступных результатов по ключевому запросу "${query}"\n`);
			} else {
				const itemLinks = await page.evaluate(() =>
					Array.from(document.querySelectorAll('.search-results__subject a'), e => e.href)
				);

				let itemsInfo = [];

				for (const link of itemLinks) {
					const itemInfo = {};
					await page.goto(link, { waitUntil: 'networkidle2' });
					const html2 = await page.content();
					const $item = cheerio.load(html2);
					let date = $item('body>div.dialog-off-canvas-main-canvas>main>section.lots-list>div>div>div.lot-item__moredetails>div>table:nth-child(2)>tbody>tr:nth-child(1)>td.data-table__info-td>p').text();
					date = date.split(' ');
					date = date[0];
					date = date.split('.');
					date[2] = '20' + date[2];
					date = date.join('.');
					itemInfo.publishDate = date;
					itemInfo.securing_requisition = $item('main>section.lots-list>div>div>div.lot-item__data> div.lot-item__infoblock.lot-item__request>span').text();
					itemInfo.securing_contract = $item('main>section.lots-list>div>div>div.lot-item__data>div.lot-item__infoblock.lot-item__contact>span.lot-item__summ').text();
					itemsInfo.push(itemInfo);
				}

				$('.search-results__item').each((i, elem) => {

					const result = {
						number: $(elem).find('.search-results__lot a').text().split(' ')[0],
						law: $(elem).find('.search-results__section p.search-results__tooltip').text(),
						type: $(elem).find('.search-results__type').text(),
						customer: $(elem).find('.search-results__customer p.search-results__tooltip').text(),
						description: $(elem).find('.search-results__subject a').text().replace(/[\n\t]/g, ' ').trim(),
						price: $(elem).find('.search-results__sum p').text(),
						published: itemsInfo[i].publishDate,
						end: $(elem).find('.search-results__time').text().replace(/\s{2,}/g, ' '),
						securing_requisition: itemsInfo[i].securing_requisition,
						securing_contract: itemsInfo[i].securing_contract,
						link: 'https://www.roseltorg.ru' + $(elem).find('.search-results__subject a').attr('href'),
						query: query,
					}

					if (
						!parseResults.filter((parseResult) => parseResult.number == result.number).length
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

				});
				data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
			}

			await page.close();

			console.log(`Roseltorg — ${query} (${count})`);
			count--;

			console.log(
				data.length > 0
					? data
					: `Roseltorg — Нет результатов удовлетворяющих критериям поиска на ${date} цена ${minPrice} по запросу "${query}"\n`,
			);
			if (count == 0) {
				await browser.close();
				myEmitter.emit('next');
			};
		}
	};
	parseData(date, minPrice, queries);
};

export { parserRoseltorg }