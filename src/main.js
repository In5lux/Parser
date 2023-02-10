import express from 'express';
import path from 'path';
import { myEmitter, dbPath, stopWordsPath, __dirname, dataInfo } from './index.js';
import { readFileSync, writeFileSync } from 'fs';
import { Server } from 'socket.io';
import http from 'http';
import bodyParser from 'body-parser';
import { txtFilterByStopWords } from './helpers/textFilter.js';
import { validateSearchParams } from './helpers/validateSearchParams.js';

export let searchParams;

export const runServer = () => {

	let isRunning = false;

	const viewPath = path.join(__dirname, 'views');

	const app = express();
	app.use(express.static(path.join(__dirname, 'public')));
	app.set('views', viewPath);
	app.set('view engine', 'pug');

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	//app.use(bodyParser.json({ type: 'application/json' }));


	const port = 3000;

	const server = http.createServer(app);
	const io = new Server(server);

	//const connections = [];	

	io.on('connection', function (socket) {
		console.log(`Пользователь ${socket.id} подключен`);
		socket.join('room');
		//console.log(socket.handshake);
		//connections.push(socket);		
		//console.log(socket.rooms);
		socket.on('send mess', async (_data) => {
			//console.log(data);
			io.to('room').emit('add mess', 'Парсинг');
			myEmitter.on('done', () => {
				io.to('room').emit('add mess', 'Выполнено');
				isRunning = false;
			});
			myEmitter.on('getExecutor', () => {
				io.to('room').emit('executor', JSON.stringify(dataInfo));
			});
		});
		socket.on('disconnect', function (_data) {
			// Удаления пользователя из массива
			//connections.splice(connections.indexOf(socket), 1);
			console.log(`Пользователь ${socket.id} отключился`);
		});
	});

	app.get('/parse', (req, res) => {
		searchParams = req.query;
		if (isRunning == false) {
			isRunning = true;
			myEmitter.emit('next');
		}
		res.send('Парсинг');
	});

	app.get('/', (req, res) => {
		res.render('index', { message: 'Необходимо выбрать параметры поиска' });
	});


	app.get('/search', (req, res) => {
		searchParams = req.query;

		if (Object.keys(searchParams).length == 0) {
			res.json({ message: 'Не выбраны параметры поиска' });
		} else if (!validateSearchParams(searchParams)) {
			res.json({ message: 'Неверные параметры поиска' });
		} else {
			let data = JSON.parse(readFileSync(dbPath, 'utf-8'));

			data = data.filter(item => txtFilterByStopWords(item.description));

			if (searchParams.desc) {
				data = data.filter(item => item.description.toLowerCase().indexOf(searchParams.desc.toLowerCase()) != -1);
			} else if (searchParams.client) {
				data = data.filter(item => item.customer.toLowerCase().indexOf(searchParams.client.toLowerCase()) != -1);
			} else {
				data = data.filter(item => item.published && searchParams.date ? item.published.toLowerCase().indexOf(searchParams.date.toLowerCase()) != -1 : item);
			}

			data.length != 0 ? res.json({ items: data.reverse() }) : res.json({ message: 'Ничего не найдено' });
		}
	});

	app.get('/db', (req, res) => {
		searchParams = req.query;

		if (Object.keys(searchParams).length == 0) {
			res.render('index', { message: 'Не выбраны параметры поиска' });
		} else if (!validateSearchParams(searchParams)) {
			res.render('index', { message: 'Неверные параметры поиска' });
		} else {
			let data = JSON.parse(readFileSync(dbPath, 'utf-8'));

			data = data.filter(item => txtFilterByStopWords(item.description));

			if (searchParams.client) {
				data = data.filter(item => item.customer.toLowerCase().indexOf(searchParams.client.toLowerCase()) != -1);
			}
			if (searchParams.desc) {
				data = data.filter(item => item.description.toLowerCase().indexOf(searchParams.desc.toLowerCase()) != -1);
			}
			if (searchParams.date) {
				data = data.filter(item => item.published.toLowerCase().indexOf(searchParams.date.toLowerCase()) != -1);
			}

			data.length != 0 ? res.render('index', { items: data.reverse() }) : res.render('index', { message: 'Ничего не найдено' });
		}
	});

	app.post('/stopwords', (req, res) => {
		const stopWord = req.body[0].toLowerCase();
		const msg = `Стоп-слово '${stopWord}' добавлено в базу`;
		console.log(msg);
		const stopWords = JSON.parse(readFileSync(stopWordsPath, 'utf-8'));
		stopWords.push(stopWord);
		writeFileSync(stopWordsPath, JSON.stringify(stopWords));
		res.send(msg);
	});

	app.get('/stopwords', (req, res) => {
		const stopWords = JSON.parse(readFileSync(stopWordsPath, 'utf-8'));
		res.json(stopWords);
	});

	app.patch('/stopwords', (req, res) => {
		const stopWords = JSON.parse(readFileSync(stopWordsPath, 'utf-8'));
		stopWords.splice(req.body[0], 1);
		writeFileSync(stopWordsPath, JSON.stringify(stopWords));
		res.json(stopWords);
	});

	server.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});
};