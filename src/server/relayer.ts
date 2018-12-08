import moment from 'moment';
import WebSocket from 'ws';

import { Dict, IOption, IPrice, IRelayerMessage, IStake } from '../common/types';
import relayerKeys from '../keys/relayerKeys.json';
import ContractWrapper from '../utils/ContractWrapper';

import util from '../utils/util';

const moduleName = 'Relayer';
const urls = {
	8000: 'https://api.hitbtc.com/api/2/public/ticker/ETHUSD',
	8001: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
	8002: 'https://api.bitfinex.com/v2/ticker/tETHUSD'
};
export default class Relayer {
	public wss: WebSocket.Server | null = null;
	public relayerID: number = 0;

	public stakes: Dict<string, IStake> = {};

	public socketIDs: number = 0;
	public clientSockets: Dict<number, WebSocket> = {};
	public clientSocketToAccountMapping: Dict<string, string> = {};
	private sk: string = '';
	private address: string = '';

	public currentPrice: IPrice = { price: this.relayerID, ts: moment.utc().valueOf() };

	public contractWrapper: any;

	constructor(relayerID: number, option: IOption) {
		const logHeader = `[${moduleName}.startServer]: `;
		this.contractWrapper = new ContractWrapper(option);
		// console.log(this.contractWrapper);
		this.relayerID = relayerID;
		this.sk = (relayerKeys as Dict<string, any>)[this.relayerID].sk;
		this.address = (relayerKeys as Dict<string, any>)[this.relayerID].addr;
		// console.log(JSON.stringify((relayerKeys as Dict<string, any>)[this.relayerID]));
		// console.log(this.relayerID)
		// console.log(this.address)
		this.wss = new WebSocket.Server({ port: this.relayerID });
		util.logInfo(logHeader + `Intialized at port ${relayerID}`);
		if (this.wss)
			this.wss.on('connection', clientWS => {
				console.log('New Connection');
				clientWS.on('message', msg => {
					this.handleClientMessage(clientWS, msg.toString());
				});
				clientWS.on('close', () => {
					console.log('connection close');
					for (const clientID in this.clientSockets)
						if (
							this.clientSockets[clientID] &&
							this.clientSockets[clientID] === clientWS
						)
							delete this.clientSockets[clientID];
				});
				this.clientSockets[this.socketIDs] = clientWS;
				this.socketIDs++;
			});
	}

	public async handleClientMessage(clientWS: WebSocket, msg: string) {
		const message: any = JSON.parse(msg);
		const op = message.op;
		const data = message.data;
		switch (op) {
			case 'stake':
				this.onStake(clientWS, data as IStake);
				break;
			case 'setAccount':
				this.onSetAccount(clientWS, data as {
					accountId: string;
				});
				break;
			// case 'subscribePrice':
			// 	this.onSubscribePrice(clientWS, data as { userPK: string; sign: string });

			// 	break;

			// case 'queryPrice':
			// ws.send(JSON.stringify(this.currentPrice));
			// break;
			default:
				clientWS.send(`No such command: ${op} `);
				break;
		}
	}

	public async onSetAccount(clientWS: WebSocket, data: { accountId: string }) {
		const logHeader = `[${moduleName}.onSetAccount]: `;
		const socketID = this.findSocketID(clientWS);
		if (socketID < 0) util.logInfo(logHeader + `Invalid socketID: ${socketID}`);
		else {
			this.clientSocketToAccountMapping[socketID] = data.accountId;
			console.log(
				logHeader +
					`[${this.relayerID}]: Socket ${socketID} is mapped to account ${data.accountId}`
			);
			const accountId = this.clientSocketToAccountMapping[socketID];
			const message = {
				op: 'setAccount',
				status: 'successful',
				data: this.getRelayerInfo(accountId)
			};
			this.clientSockets[socketID].send(JSON.stringify(message));
		}
	}

	public async onStake(clientWS: WebSocket, stake: IStake) {
		const logHeader = `[${moduleName}.onSetAccount]: `;
		const socketID = this.findSocketID(clientWS);
		if (socketID < 0)
			util.logInfo(logHeader + `[${this.relayerID}]: Invalid socketID: ${socketID}`);
		else {
			this.stakes[stake.accountAddress] = stake;
			console.log(
				logHeader +
					`[${this.relayerID}]: Account ${stake.accountAddress}` +
					` stake updated:  ${JSON.stringify(this.stakes[stake.accountAddress])}`
			);
			const accountId = this.clientSocketToAccountMapping[socketID];
			const message: IRelayerMessage = {
				op: 'stake',
				status: 'successful',
				data: this.getRelayerInfo(accountId)
			};
			this.clientSockets[socketID].send(JSON.stringify(message));
		}
	}

	public async updatePrice() {
		const logHeader = `[${moduleName}.updatePrice]: `;
		this.currentPrice = await this.fetchPrice();
		util.logInfo(logHeader + `[${this.relayerID}]: Update price: ${this.currentPrice.price}`);
		for (const socketID in this.clientSockets)
			if (this.clientSockets[socketID]) {
				const accountId = this.clientSocketToAccountMapping[socketID];
				const message = {
					op: 'updatePrice',
					status: 'successful',
					data: this.getRelayerInfo(accountId)
				};
				this.clientSockets[socketID].send(JSON.stringify(message));
			}
	}

	public async commitPrice(option: IOption) {
		const logHeader = `[${moduleName}.commitPrice]: `;
		util.logInfo(logHeader + JSON.stringify(option));
		this.sk = this.sk;

		// const gasPrice = (await this.contractWrapper.web3.eth.getGasPrice()) || option.gasPrice;
		const gasPrice = 5;
		util.logInfo('gasPrice price ' + gasPrice + ' gasLimit is ' + option.gasLimit);
		const paras = [
			this.address,
			this.sk,
			this.currentPrice.price * 1e18,
			this.currentPrice.ts,
			option.gasPrice || 8000000000,
			option.gasLimit || 2000000
		];
		console.log(JSON.stringify(paras, null, 4));
		// return this.contractWrapper.commitPriceRaw(
		// 	this.address,
		// 	this.sk,
		// 	this.currentPrice.price * 1e18,
		// 	Math.floor(this.currentPrice.ts / 1000),
		// 	[],
		// 	gasPrice,
		// 	option.gasLimit
		// );
		return this.contractWrapper.commitPriceRaw(
			this.address,
			this.sk,
			this.currentPrice.price * 1e18,
			this.currentPrice.ts,
			option.gasPrice || 8000000000,
			option.gasLimit || 2000000
		);
	}

	public getRelayerInfo(accountId: string) {
		let stakedAmt = 0;
		if (accountId && this.stakes[accountId]) stakedAmt = this.stakes[accountId].stakeAmt;
		return Object.assign(this.currentPrice, {
			relayerID: this.relayerID,
			stakedAmt: stakedAmt,
			accountId: !accountId ? '' : accountId
		});
	}

	public startNewRound() {
		this.stakes = {};
		for (const clientWS of Object.values(this.clientSockets)) clientWS.send('startNewRound');
	}

	public async fetchPrice() {
		const url = (urls as any)[this.relayerID];
		console.log(url);
		const data = await util.get(url);
		switch (this.relayerID) {
			case 8000:
				this.currentPrice.price = JSON.parse(data).last;
				break;
			case 8001:
				this.currentPrice.price = JSON.parse(data).price;
				break;
			case 8002:
				this.currentPrice.price = JSON.parse(data)[6];
				break;
			default:
				break;
		}
		// this.currentPrice.price = this.relayerID * 100000 + (moment.utc().valueOf() % 1000);
		this.currentPrice.ts = moment.utc().valueOf();
		return this.currentPrice;
	}

	public findSocketID(clientWS: WebSocket) {
		const logHeader = `[${moduleName}.findSocketID]: `;
		let socketID = -1;
		for (const id in this.clientSockets)
			if (this.clientSockets[id] === clientWS) socketID = Number(id);
		if (socketID < 0) util.logInfo(logHeader + `Invalid socketID: ${socketID}`);
		return socketID;
	}
}
