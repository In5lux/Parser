import { writeFileSync, readFileSync } from 'fs';
import { parsingStatusPath } from '../index.js';
import { format } from 'date-fns';

export class Status {
	static get() {
		return JSON.parse(readFileSync(parsingStatusPath, 'utf-8'));
	}
	static run() {
		writeFileSync(parsingStatusPath, JSON.stringify({
			lastUpdateTime: format(new Date(), 'dd.MM.yyyy, HH:mm:ss'),
			status: 'Парсинг'
		}));
	}
	static done() {
		writeFileSync(parsingStatusPath, JSON.stringify({
			lastUpdateTime: format(new Date(), 'dd.MM.yyyy, HH:mm:ss'),
			status: 'Выполнено'
		}));
	}
}