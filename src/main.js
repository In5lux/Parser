import express from 'express';
import path from 'path';
import { myEmitter, dbPath, __dirname } from './index.js';
import { readFileSync } from 'fs';
import { Server } from 'socket.io';
import http from 'http';

export let searchParams;

export const runServer = () => {

	const viewPath = path.join(__dirname, 'views');

	const app = express();
	app.use(express.static(path.join(__dirname, 'public')));
	app.set('views', viewPath);
	app.set('view engine', 'pug');

	const port = 3000;

	const server = http.createServer(app);
	const io = new Server(server);

	io.sockets.on('connection', (socket) => {
		//console.log('Socket connection');
		socket.on('send mess', function (_data) {
			io.sockets.emit('add mess', 'Обновление');
			myEmitter.on('done', () => {
				io.sockets.emit('add mess', 'Выполнено');
			});
		});
	});

	app.get('/parse', (req, res) => {
		searchParams = req.query;
		myEmitter.emit('next');
		res.send('Парсинг');
	});

	app.get('/db', (req, res) => {
		let data = JSON.parse(readFileSync(dbPath, 'utf-8'));
		searchParams = req.query;
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

	server.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});
};