import { EventEmitter } from 'node:events';
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
	parserB2BCenter,
];

const parsersIterator = parsers[Symbol.iterator]();

export const myEmitter = new EventEmitter();

myEmitter.on('next', () => {
	const { value, done } = parsersIterator.next();
	!done ? value() : done;
});

parsersIterator.next().value();