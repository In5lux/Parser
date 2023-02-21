import { writeFileSync, readFileSync } from 'fs';
import { parsingStatusPath } from '../index.js';

export class Status {
	static get() {
		return JSON.parse(readFileSync(parsingStatusPath, 'utf-8'));
	}
	static run() {
		writeFileSync(parsingStatusPath, JSON.stringify({
			lastUpdateTime: new Date().toLocaleString(),
			status: 'Парсинг'
		}));
	}
	static done() {
		writeFileSync(parsingStatusPath, JSON.stringify({
			lastUpdateTime: new Date().toLocaleString(),
			status: 'Выполнено'
		}));
	}
}