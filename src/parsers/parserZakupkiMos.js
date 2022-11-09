import puppeteer from 'puppeteer';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import cheerio from 'cheerio';
import { options, bot, myEmitter } from '../index.js';
import { txtFilterByStopWords } from '../helpers/textFilter.js';

const parserZakupkiMos = () => {
	const args = getArgs(argv);

	const minPrice = args.s ? args.s : 100_000;

	const date = args.d ? args.d : format(new Date(), 'dd.MM.yyyy');

	const customer = args.c?.toLowerCase();

	// Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

	class UrlEncode {
		constructor(query) {
			this.url = `https://zakupki.mos.ru/purchase/list?page=1&perPage=50&sortField=relevance&sortDesc=true&filter=%7B%22nameLike%22%3A%22${encodeURIComponent(query)}%22%2C%22auctionSpecificFilter%22%3A%7B%22stateIdIn%22%3A%5B19000002%5D%7D%2C%22needSpecificFilter%22%3A%7B%22stateIdIn%22%3A%5B20000002%5D%7D%2C%22tenderSpecificFilter%22%3A%7B%22stateIdIn%22%3A%5B5%5D%7D%7D&state=%7B%22currentTab%22%3A1%7D`;
		}
	}

	const queries = args.q
		? [args.q]
		: [
			'Авиабилетов',
			'Командировок',
			'Деловых поездок',
			'Служебных поездок',
			'Командирований',
			'Авиаперевозки'
		];

	const parseResults = [];

	console.log(
		`\nZakupki Mos — Результаты на ${date === '*' ? 'все опубликованные закупки' : date
		} с минимальной суммой контракта ${minPrice}\n`
	);

	const parseData = async (minPrice, queries) => {
		const browserFetcher = puppeteer.createBrowserFetcher();
		const revisionInfo = await browserFetcher.download('991974');

		const browser = await puppeteer.launch({
			executablePath: revisionInfo.executablePath,
			headless: true, // false: enables one to view the Chrome instance in action
			// defaultViewport: { width: 1263, height: 930 }, // optional
			slowMo: 25
		});

		let count = queries.length;

		for (const query of queries) {
			const url = new UrlEncode(query).url;
			const page = await browser.newPage();
			page.setDefaultNavigationTimeout(0);
			// await page.waitForTimeout(3000);
			await page.goto(url, { waitUntil: 'networkidle2' });
			await page.waitForTimeout(5000);
			// await page.setViewport({ width: 1263, height: 930 })
			// await page.screenshot({ path: 'page.png' });
			// await page.pdf({ path: `page ${query}.pdf`, printBackground: true, width: '1263px', height: '930px' });
			const HTML = await page.content();
			const $ = cheerio.load(HTML);

			await page.close();

			let data = [];

			const isExsist = !$('body').text().includes('Ничего не нашлось');

			if (isExsist) {
				$('.PublicListStyles__PublicListContentContainer-sc-1q0smku-1>div').each((i, elem) => {

					const description = $(elem).find('a.CardStyles__MainInfoNameHeader-sc-18miw4v-8>span').text();

					if (txtFilterByStopWords(description)) {
						const result = {
							number: $(elem).find('a.CardStyles__MainInfoNumberHeader-sc-18miw4v-4>span').text(),
							type: $(elem).find('.CardStyles__FlexContainer-sc-18miw4v-0>span').text(),
							law: $(elem).find('.CardStyles__AdditionalInfoHeader-sc-18miw4v-11:nth-child(2)>span').text(),
							status: $(elem).find('.CardStyles__MainInfoStateIndicator-sc-18miw4v-5>div.content').text(),
							customer: $(elem).find('.PurchaseCardStyles__MainInfoCustomerHeader-sc-3hfhop-0').text(),
							description,
							price: $(elem).find('.CardStyles__PriceInfoNumber-sc-18miw4v-9').text(),
							published: $(elem).find('.CardStyles__AdditionalInfoHeader-sc-18miw4v-11:nth-child(3)>span').text().split(' ')[1],
							end: $(elem).find('.CardStyles__AdditionalInfoHeader-sc-18miw4v-11:nth-child(3)>span').text().split(' ')[3],
							link: 'https://zakupki.mos.ru' + $(elem).find('a.CardStyles__MainInfoNameHeader-sc-18miw4v-8').attr('href')
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
								if (isCustomer || customer === undefined) {
									// Фильтр по наименованию клиента
									data.push(result);
								}
							}
						}
						parseResults.push(result);

						data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
					}
				});
			} else {
				console.log(`Zakupki Mos — Нет доступных результатов по ключевому запросу "${query}" (${count})\n`);
			}
			// console.log(`Zakupki Mos —  ${query} (${count})`);

			if (data.length > 0) {
				console.log(data);
				for (const item of data) {
					const message = `*Номер закупки:* ${item.number}\n\n`
						+ `*Тип закупки:* ${item.type}\n\n`
						+ `*ФЗ:* ${item.law}\n\n`
						+ `*Статус:* ${item.status}\n\n`
						+ `*Клиент:* ${item.customer}\n\n`
						+ `*Описание:* ${item.description}\n\n`
						+ `*Цена:* ${item.price}\n\n`
						+ `*Дата публикации:* ${item.published}\n\n`
						+ `*Окончание:* ${item.end}\n\n`
						+ `*Ссылка:* ${item.link}`;

					bot.telegram.sendMessage(options.parsed['CHAT_ID'], message, { parse_mode: 'Markdown' });
				}
			} else {
				console.log(`Zakupki Mos — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query}" (${count})\n`);
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

export { parserZakupkiMos };
