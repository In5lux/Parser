import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { myEmitter } from '../index.js'

const parserB2BCenter = () => {

	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 300000;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	const customer = args.c?.toLowerCase();

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"	

	const queries = args.q
		? [args.q]
		: [
			'Организация командировок',
			'Организация деловых поездок',
			'Служебных поездок',
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

	console.log(`\nB2B Center — Результаты на ${date === '*' ? 'все опубликованные закупки' : date
		} с минимальной суммой контракта ${minPrice}\n`,
	);

	const parseData = async (minPrice, queries) => {

		const browser = await puppeteer.launch({
			headless: true, // false: enables one to view the Chrome instance in action
			defaultViewport: { width: 1400, height: 700 }, // optional
			slowMo: 25
		});

		let count = queries.length;

		for (let query of queries) {

			const page = await browser.newPage();
			//page.setDefaultNavigationTimeout(0);			
			await page.goto('https://www.b2b-center.ru/market/', { waitUntil: 'networkidle2' });
			// await page.waitForSelector('#lfm0');
			// await page.focus('#lfm0');			
			await page.waitForSelector('#f_keyword');
			await page.focus('#f_keyword');
			await page.waitForTimeout(1000);
			await page.keyboard.type(query);
			await page.waitForTimeout(2000);
			await page.click('#search_button');
			//await page.keyboard.down('Tab');
			//await page.keyboard.down('Enter');
			//await page.screenshot({ path: `page ${query}.png` });
			await page.waitForTimeout(2000);
			const html = await page.content();

			const $ = cheerio.load(html);


			await page.waitForTimeout(2000);
			await page.close();


			const isExsist = !$('body').text().includes('нет актуальных торговых процедур');

			let data = [];

			if (isExsist) {
				$('table.search-results>tbody>tr').each((i, elem) => {

					const result = {
						number: $(elem).find('td:first-child>a').text().match(/№\s\d{1,}/g)[0],
						type: $(elem).find('td:first-child>a').text().match(/^[а-яА-Я\s]+[а-я]/g)[0],
						customer: $(elem).find('td:nth-child(2)>a').text(),
						description: $(elem).find('div.search-results-title-desc').text().replace(/\n/g, ' '),
						published: $(elem).find('td:nth-child(3)').text().split(' ')[0],
						end: $(elem).find('td:last-child').text().split(' ')[0],
						link: $(elem).find('td:first-child>a').attr('href'),
					};

					if (!result.link.startsWith('https')) {
						result.link = 'https://www.b2b-center.ru' + result.link
					}

					if (
						!parseResults.filter((parseResult) => parseResult.number == result.number).length
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
						//data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
					}
					parseResults.push(result);
				});
			} else {
				console.log(`B2B Center — Нет доступных результатов по ключевому запросу "${query} (${count})"\n`);
			}
			
			if (data.length > 0) {
				console.log(data);
			} else {
				console.log(`B2B Center — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query} (${count})"\n`);
			}

			count--;
			if (count == 0) {
				await browser.close();
				setTimeout(() => {
					myEmitter.emit('next');
				}, 3000);
			};
		}
	};
	parseData(minPrice, queries);
}

export { parserB2BCenter }