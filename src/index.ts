// fix for @ledgerhq/hw-transport-u2f 4.28.0
import '@babel/polyfill';
import * as CST from './common/constants';
import { Dict } from './common/types';

// import relayer from './relayer';
// import relayerServer from './server/relayerServer';
import Client from './server/client';
import Relayer from './server/relayer';
// import util from './utils/util';
// import Web3Util from './utils/Web3Util';
// import Web3Util from './utils/Web3Util';

// const tool = process.argv[2];
// util.logInfo('tool ' + tool);
// const option: IOption = util.parseOptions(process.argv);

// const start = async () => {
// import relayerServer from './server/relayerServer';
// import util from './utils/util';
// import Web3Util from './utils/Web3Util';

// const tool = process.argv[2];
// util.logInfo('tool ' + tool);
// const option: IOption = util.parseOptions(process.argv);

// };

// start();

// const options = util.parseOptions(process.argv);

const start = async () => {};

start();

const tool = process.argv[2];

const relayers: Dict<string, Relayer> = {};
let client;
switch (tool) {
	case 'startRelayers':
		for (const port of CST.RELAYER_PORTS) {
			relayers[port] = new Relayer(Number(port));
			setInterval(() => relayers[port].updatePrice(), 2 * 1000);
		}
		break;
	case 'startClient':
		client = new Client();
		console.log(typeof client);
}
