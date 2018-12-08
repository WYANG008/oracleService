// fix for @ledgerhq/hw-transport-u2f 4.28.0
import '@babel/polyfill';
import * as CST from './common/constants';
import relayerServer from './server/relayerServer';
import util from './utils/util';
import Web3Util from './utils/Web3Util';

const tool = process.argv[2];
util.logInfo('tool ' + tool);
const option: IOption = util.parseOptions(process.argv);

const start = async () => {
	
};

start();
