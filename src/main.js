import express from 'express';
import path from 'path';
import { myEmitter, dbPath, __dirname } from './index.js';
import { readFileSync } from 'fs';

export let searchParams;

export const runServer = () => {

	const viewPath = path.join(__dirname, 'views');

	const app = express();
	app.use(express.static(path.join(__dirname, 'public')));
	app.set('views', viewPath);
	app.set('view engine', 'pug');

	const port = 3000;

	app.get('/parse', (req, res) => {
		searchParams = req.query;
		myEmitter.emit('next');
		res.send('Start parsing');
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

		Object.keys(searchParams).length != 0 ? res.render('index', { items: data }) : res.send('Не выбраны параметры поиска');
	});

	app.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});
};