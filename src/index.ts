// fix for @ledgerhq/hw-transport-u2f 4.28.0
import '@babel/polyfill';
import moment from 'moment';
import * as CST from './common/constants';
import { Dict, IOption } from './common/types';

// import relayer from './relayer';
// import relayerServer from './server/relayerServer';
import Client from './server/client';
import Relayer from './server/relayer';
import ContractWrapper from './utils/ContractWrapper';

import util from './utils/util';
import Web3Util from './utils/Web3Util';

const schedule = require('node-schedule');

const tool = process.argv[2];
util.logInfo('tool ' + tool);
const option: IOption = util.parseOptions(process.argv);

if (!option.provider) {
	const infura = require('./keys/infura.json');
	if (option.source === CST.SRC_INFURA)
		option.provider = CST.PROVIDER_INFURA_KOVAN + '/' + infura.token;
}

const contractWrapper = new ContractWrapper(option);
const web3Util = new Web3Util(null, option, contractWrapper);

const relayers: Dict<string, Relayer> = {};
let client;

const kovanManagerAccount = require('./keys/kovanManagerAccount.json');
switch (tool) {
	case 'startRelayers':
		for (const relayerID of CST.RELAYER_PORTS) {
			relayers[relayerID] = new Relayer(Number(relayerID));
			setInterval(() => relayers[relayerID].updatePrice(), 3 * 1000);
			schedule.scheduleJob('*/5 * * * * * ', () => {
				relayers[relayerID].commitPrice({} as any);
			});
			// setInterval(() => relayers[relayerID].commitPrice({} as any), 30 * 1000);
		}

		break;
	case 'startClient':
		client = new Client();
		console.log(typeof client);
		break;
	case 'getStates':
		web3Util.getStates();
		break;
	case 'getStakes':
		web3Util.getStakedToken('0x00BCE9Ff71E1e6494bA64eADBB54B6B7C0F5964A');
		break;
	case 'startOracle':
		const nextHour = Math.floor(
			moment()
				.utc()
				.endOf('hours')
				.add(-20, 'minutes')
				.valueOf() / 1000
		);
		contractWrapper.startOracleRaw(
			kovanManagerAccount.address,
			kovanManagerAccount.privateKey,
			nextHour,
			option.gasPrice || 2000000000,
			option.gasLimit || 2000000
		);
		break;
	case 'addList':
		contractWrapper.addWhiteListRaw(
			kovanManagerAccount.address,
			kovanManagerAccount.privateKey,
			option.address,
			option.gasPrice || 2000000000,
			option.gasLimit || 2000000
		);
		break;
	case 'commitPrice':
		const time = Math.floor(
			moment()
				.utc()
				.endOf('minutes')
				.valueOf() / 1000
		);
		contractWrapper.commitPriceRaw(
			kovanManagerAccount.address,
			kovanManagerAccount.privateKey,
			100 * 1e18,
			time,
			option.gasPrice || 2000000000,
			option.gasLimit || 2000000
		);
		break;
	default:
		break;
}
