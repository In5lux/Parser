import { parserZakupkiGov } from './parsers/parserZakupkiGov.js';
import { parserRosatom } from './parsers/parserRosatom.js';
import { parserZakazRF } from './parsers/parserZakazRF.js';
import { parserEtpEts } from './parsers/parserEtpEts.js';
import { parserFabrikant } from './parsers/parserFabrikant.js';
import { parserZakupkiMos } from './parsers/parserZakupkiMos.js';
import { parserSberbankAst } from './parsers/parserSberbankAst.js';
import { parserB2BCenter } from './parsers/parserB2BCenter.js';
import { parserLOTonline } from './parsers/parserLOTonline.js';

parserZakupkiGov();
parserRosatom();
parserZakazRF();
parserEtpEts();
parserFabrikant();
parserZakupkiMos();
parserSberbankAst();
parserB2BCenter();
parserLOTonline();