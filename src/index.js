#!/usr/bin/env node

import { config } from 'dotenv';
import { Telegraf } from 'telegraf';
import { EventEmitter } from 'events';
import { parserZakupkiGov } from './parsers/parserZakupkiGov.js';
import { parserRosatom } from './parsers/parserRosatom.js';
import { parserZakazRF } from './parsers/parserZakazRF.js';
import { parserEtpEts } from './parsers/parserEtpEts.js';
import { parserFabrikant } from './parsers/parserFabrikant.js';
import { parserZakupkiMos } from './parsers/parserZakupkiMos.js';
import { parserSberbankAst } from './parsers/parserSberbankAst.js';
import { parserB2BCenter } from './parsers/parserB2BCenter.js';
import { parserLOTonline } from './parsers/parserLOTonline.js';
import { parserRoseltorg } from './parsers/parserRoseltorg.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export const dbPath = path.join(__dirname, '../db/db.json');

config({ path: path.join(__dirname, '../.env') });

export const bot = new Telegraf(process.env.TOKEN);
export let db = JSON.parse(readFileSync(dbPath, 'utf-8')).flat();

console.clear();

const parsers = [
	parserZakupkiGov,
	parserRosatom,
	parserFabrikant,
	parserEtpEts,
	parserZakazRF,
	parserRoseltorg,
	parserSberbankAst,
	parserZakupkiMos,
	parserLOTonline,
	parserB2BCenter
];

const parsersIterator = parsers[Symbol.iterator]();

export const myEmitter = new EventEmitter();

myEmitter.on('next', () => {
	const { value, done } = parsersIterator.next();
	!done ? value() : done;
});

console.log(new Date().toLocaleString());

parsersIterator.next().value();