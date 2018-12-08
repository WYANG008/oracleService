// fix for @ledgerhq/hw-transport-u2f 4.28.0
import '@babel/polyfill';
import * as CST from './common/constants';
import { Dict, IOption } from './common/types';

// import relayer from './relayer';
// import relayerServer from './server/relayerServer';
import Client from './server/client';
import Relayer from './server/relayer';
import util from './utils/util';
import ContractWrapper from './utils/ContractWrapper';
import Web3Util from './utils/Web3Util';

const tool = process.argv[2];
util.logInfo('tool ' + tool);
const option: IOption = util.parseOptions(process.argv);

if (!option.provider) {
	const infura = require('./keys/infura.json');
	if (option.source === CST.SRC_INFURA)
		option.provider = CST.PROVIDER_INFURA_KOVAN + '/' + infura.token;
}

const contractWrapper = new ContractWrapper(option);
const web3Util = new Web3Util(null, option, '');

const relayers: Dict<string, Relayer> = {};
let client;
switch (tool) {
	case 'startRelayers':
		for (const relayerID of CST.RELAYER_PORTS) {
			relayers[relayerID] = new Relayer(Number(relayerID));
			setInterval(() => relayers[relayerID].updatePrice(), 3 * 1000);
			setInterval(() => relayers[relayerID].commitPrice({} as any), 30 * 1000);
		}

		break;
	case 'startClient':
		client = new Client();
		console.log(typeof client);
		break;
	case 'getStates':
		web3Util.getStates();
		break;
	default:
		break;
}
