import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { myEmitter } from '../index.js'

const parserSberbankAst = () => {

	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 0;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	const customer = args.c?.toLowerCase();

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

	console.log(`\nSberbank AST — Результаты на ${date === '*' ? 'все опубликованные закупки' : date
		} с минимальной суммой контракта ${minPrice}\n`,
	);

	const queries = args.q
		? [args.q]
		: [
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
			'Организации воздушных перевозок',
			'Перевозкам воздушным транспортом',
			'Пассажирские авиаперевозки иностранных граждан',
			'Оказание услуг связанных с бронированием',
			'Оказание услуг по организации командирования',
			'Билетного аутсорсинга'
		];

	let parseResults = [];

	const parseData = async (minPrice, queries) => {

		const browserFetcher = puppeteer.createBrowserFetcher();
		const revisionInfo = await browserFetcher.download('991974');

		const browser = await puppeteer.launch({
			executablePath: revisionInfo.executablePath,
			headless: true, // false: enables one to view the Chrome instance in action
			//defaultViewport: { width: 1263, height: 930 }, // optional
			slowMo: 25
		});

		let count = queries.length;

		for (let query of queries) {

			const page = await browser.newPage();
			page.setDefaultNavigationTimeout(0);
			//await page.waitForTimeout(3000);
			await page.goto('https://www.sberbank-ast.ru', { waitUntil: 'networkidle2' });
			await page.waitForSelector('#txtUnitedPurchaseSearch');
			await page.focus('#txtUnitedPurchaseSearch');
			await page.waitForTimeout(1000);
			await page.keyboard.type(query);
			await page.click('#btnUnitedPurchaseSearch');
			await page.waitForTimeout(3000);
			//await page.screenshot({ path: `page ${query}.png` });
			const html = await page.evaluate(() => {
				try {
					return document.documentElement.outerHTML;
				} catch (e) {
					return e.toString();
				}
			});

			await page.close();

			const $ = cheerio.load(html);

			const isExsist = !$('body').text().includes('Нет результатов для данной настройки поиска');

			let data = [];

			if (isExsist) {
				$('.purch-reestr-tbl-div').each((i, elem) => {

					const result = {
						number: $(elem).find('.es-el-code-term').text(),
						section: $(elem).find('.es-el-source-term').text(),
						type: $(elem).find('.es-el-type-name').text(),
						status: $(elem).find('div.BidStateName').text() || $(elem).find('div.PurchStateName').text(),
						customer: $(elem).find('.es-el-org-name').text(),
						description: $(elem).find('.es-el-name').text().replace(/\n/g, ' '),
						price: $(elem).find('.es-el-amount').text().replace(/\s{2,}/g, ' ') || '0.00',
						published: $(elem).find('tr:first-child>td:last-child>table>tbody>tr:first-child>td:last-child>span').text().split(' ')[0],
						end: $(elem).find('tr:first-child>td:last-child>table>tbody>tr:nth-child(3)>td:last-child>div>span').text().split(' ')[0],
						link: $(elem).find('tr:nth-child(1)>td:nth-child(2)>div:nth-child(1)>input:nth-child(4)').attr('value'),
						query: query,
					};

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
						data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
					}
					parseResults.push(result);
				});

			} else {
				console.log(`Sberbank AST — Нет доступных результатов по ключевому запросу "${query}"\n`);
			}
			console.log(`Sberbank AST — ${query} (${count})`);
			count--;

			console.log(
				data.length > 0
					? data
					: `Sberbank AST — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query}"\n`,
			);
			if (count == 0) {
				await browser.close();
				myEmitter.emit('next');
			};
		}
	};
	parseData(minPrice, queries);
};

export { parserSberbankAst }