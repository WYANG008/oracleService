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
		console.log(`Option: ` + JSON.stringify(option));
		for (const relayerID of CST.RELAYER_PORTS) {
			relayers[relayerID] = new Relayer(Number(relayerID), option);
			setInterval(() => relayers[relayerID].updatePrice(), 10 * 1000);
			schedule.scheduleJob('*/30 * * * * *  ', () => {
				util.logInfo('>>>>>>>' + `Commit Price`);
				relayers[relayerID]
					.commitPrice(option)
					.then(res => util.logInfo(JSON.stringify(res)));
			});
			// relayers[relayerID].commitPrice(option);
			// setInterval(() => relayers[relayerID].commitPrice({} as any), 60 * 1000);
		}

		break;
	case 'startOracleRegularly':
		schedule.scheduleJob('*/5 * * * *', () => {
			const end = util.getPeriodEndTimestamp(moment.utc().valueOf() + 5 * 1000, 5, 0);
			util.logInfo('startOracle' + moment.utc(end).format('YYYY-MM-DD HH:mm:ss'));
			contractWrapper.startOracleRaw(
				kovanManagerAccount.address,
				kovanManagerAccount.privateKey,
				end,
				[
					'0x00BCE9Ff71E1e6494bA64eADBB54B6B7C0F5964A',
					'0x191007577d31275c71C0E80064dCD5cE5268F566',
					'0x773d5C1D30504fCcC608BAEa9a56F90Ff92ffA0D',
					'0x47629962042a672e0DbF1a1AB6F8A38461E46543'
				],
				option.gasPrice || 2000000000,
				option.gasLimit || 2000000
			);
		});
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
				.add(-25, 'minutes')
				.valueOf() / 1000
		);
		contractWrapper.startOracleRaw(
			kovanManagerAccount.address,
			kovanManagerAccount.privateKey,
			nextHour,
			[
				'0x00BCE9Ff71E1e6494bA64eADBB54B6B7C0F5964A',
				'0x191007577d31275c71C0E80064dCD5cE5268F566',
				'0x773d5C1D30504fCcC608BAEa9a56F90Ff92ffA0D',
				'0x47629962042a672e0DbF1a1AB6F8A38461E46543'
			],
			option.gasPrice || 8000000000,
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
	case 'stake':
		contractWrapper.stakeRaw(
			kovanManagerAccount.address,
			kovanManagerAccount.privateKey,
			contractWrapper.web3.utils.toWei('1000', 'ether'),
			option.gasPrice || 2000000000,
			option.gasLimit || 2000000
		);
		break;
	case 'unsTake':
		contractWrapper.unStakeRaw(
			kovanManagerAccount.address,
			kovanManagerAccount.privateKey,
			contractWrapper.web3.utils.toWei('1000', 'ether'),
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
			option.gasPrice || 8000000000,
			option.gasLimit || 2000000
		);
		break;
	default:
		break;
}
