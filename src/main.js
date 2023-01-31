import express from 'express';
import path from 'path';
import { myEmitter, dbPath, stopWordsPath, __dirname } from './index.js';
import { readFileSync, writeFileSync } from 'fs';
import { Server } from 'socket.io';
import http from 'http';
import bodyParser from 'body-parser';
import { txtFilterByStopWords } from './helpers/textFilter.js';

export let searchParams;

console.log();

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

	app.get('/db', (req, res) => {
		let data = JSON.parse(readFileSync(dbPath, 'utf-8'));
		searchParams = req.query;
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

		Object.keys(searchParams).length != 0 && data.length != 0 ?
			res.render('index', { items: data.reverse() })
			: data.length == 0 ?
				res.render('index', { message: 'Ничего не найдено' })
				: res.render('index', { message: 'Не выбраны параметры поиска' });
	});

	app.post('/stopwords', (req, res) => {
		const stopWord = req.body[0].toLowerCase();
		console.log(stopWord);
		const stopWords = JSON.parse(readFileSync(stopWordsPath, 'utf-8'));
		stopWords.push(stopWord);
		writeFileSync(stopWordsPath, JSON.stringify(stopWords));
		res.send(JSON.stringify(`Стоп-слово '${stopWord}' добавлено в базу`));
	});

	server.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});
};