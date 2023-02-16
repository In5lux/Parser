import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { bot, myEmitter, db, dbPath, mailer } from '../index.js';
import { writeFileSync } from 'fs';
import { isNew } from '../helpers/isNew.js';
import { priceFilter } from '../helpers/priceFilter.js';
import { searchParams } from '../main.js';
import { Template } from '../mailer/template/mail-template.service.js';

const parserSberbankAst = () => {

	let delay = 0;

	const args = getArgs(argv);

	const minPrice = args.s || searchParams?.price || 300_000;

	const date = searchParams?.date || args.d || format(new Date(), 'dd.MM.yyyy');

	const customer = args.c?.toLowerCase() || searchParams?.client;

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

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

	const parseResults = [];

	console.log(`\nSberbank AST — Результаты на ${date === '*' ? 'все опубликованные закупки' : date} с минимальной суммой контракта ${minPrice}\n`
	);

	const parseData = async (minPrice, queries) => {
		// const browserFetcher = puppeteer.createBrowserFetcher();
		// const revisionInfo = await browserFetcher.download('991974');

		const browser = await puppeteer.launch({
			// executablePath: revisionInfo.executablePath,
			// headless: true, // false: enables one to view the Chrome instance in action
			// defaultViewport: { width: 1263, height: 930 }, // optional
			slowMo: 25,
			args: ['--no-sandbox', '--headless', '--disable-gpu']
		});

		let count = queries.length;

		for (const query of queries) {
			const page = await browser.newPage();
			page.on('dialog', async dialog => {
				console.log(dialog.message());
				await dialog.accept();
			});
			page.setDefaultNavigationTimeout(0);
			page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
			// await page.waitForTimeout(3000);
			await page.goto('https://www.sberbank-ast.ru', { waitUntil: 'networkidle2' });
			await page.waitForSelector('#txtUnitedPurchaseSearch');
			await page.focus('#txtUnitedPurchaseSearch');
			await new Promise(r => setTimeout(r, 1000));
			await page.keyboard.type(query);
			await new Promise(r => setTimeout(r, 1000));
			await page.click('#btnUnitedPurchaseSearch');
			await new Promise(r => setTimeout(r, 3000));
			// await page.screenshot({ path: `page ${query}.png` });
			const html = await page.evaluate(() => {
				try {
					// eslint-disable-next-line no-undef
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
						query
					};

					if (
						!parseResults.filter((parseResult) => parseResult.link == result.link).length
						// Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
					) {
						if (result.published === date || date === '*') {
							// Фильтр по дате, если дата не указана выводятся все даты
							const isCustomer = customer
								? !!result.customer.toLowerCase().replaceAll('"', '').match(customer)
								: undefined;
							if (isCustomer || customer === undefined && priceFilter(result.price, minPrice)) {
								// Фильтр по наименованию клиента
								data.push(result);
								if (isNew(db, result.number)) {
									db.push(result);
									writeFileSync(dbPath, JSON.stringify(db));
									const message = `*Номер закупки:* ${result.number}\n\n`
										+ `*Секция площадки:* ${result.section}\n\n`
										+ `*Статус:* ${result.status}\n\n`
										+ `*Тип закупки:* ${result.type}\n\n`
										+ `*Клиент:* ${result.customer}\n\n`
										+ `*Описание:* ${result.description}\n\n`
										+ `*Цена:* ${result.price}\n\n`
										+ `*Дата публикации:* ${result.published}\n\n`
										+ `*Окончание:* ${result.end}\n\n`
										+ `*Ссылка:* ${result.link}`;

									setTimeout(() => {
										bot.telegram.sendMessage(process.env.CHAT_ID, message, { parse_mode: 'Markdown' });
										mailer.send(new Template([result]));
									}, delay);
									delay += 1000;
								}
							}
						}
						//data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
					}
					parseResults.push(result);
				});
			} else {
				console.log(`Sberbank AST — Нет доступных результатов по ключевому запросу "${query}"\n`);
			}
			// console.log(`Sberbank AST — ${query} (${count})`);

			if (data.length > 0) {
				console.log(data);
			} else {
				console.log(`Sberbank AST — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query}" (${count})\n`);
			}

			count--;
			if (count == 0) {
				await browser.close();
				setTimeout(() => {
					myEmitter.emit('next');
				}, 3000);
			}
		}
	};
	parseData(minPrice, queries);
};

export { parserSberbankAst };