import { parserZakupkiGov } from './parsers/parserZakupkiGov.js';
import { parserRosatom } from './parsers/parserRosatom.js';
import { parserZakazRF } from './parsers/parserZakazRF.js';
import { parserEtpEts } from './parsers/parserEtpEts.js';
import { parserFabrikant } from './parsers/parserFabrikant.js';

parserZakupkiGov();
parserRosatom();
parserZakazRF();
parserEtpEts();
parserFabrikant();