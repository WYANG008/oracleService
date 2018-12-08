import moment from 'moment';
import WebSocket from 'ws';

import { Dict, IPrice, IRelayerMessage, IStake } from '../common/types';
import relayerKeys from '../keys/relayerKeys.json';
import ContractWrapper from '../utils/ContractWrapper';

import util from '../utils/util';

const moduleName = 'Relayer';
const urls = {
	8001: 'https://api.hitbtc.com/api/2/public/ticker/ETHUSD',
	8002: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
	8003: 'https://api.bitfinex.com/v2/ticker/tBTCUSD'
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

	public currentPrice: IPrice = { price: this.relayerID, ts: 0 };

	public contractWrapper = new ContractWrapper({} as any);

	constructor(relayerID: number) {
		const logHeader = `[${moduleName}.startServer]: `;
		this.relayerID = relayerID;
		this.sk = (relayerKeys as Dict<string, any>)[this.relayerID].sk;
		this.address = (relayerKeys as Dict<string, any>)[this.relayerID].address;
		this.wss = new WebSocket.Server({ port: this.relayerID });
		console.log(logHeader + `Intialized at port ${relayerID}`);
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
		if (socketID < 0) console.log(logHeader + `Invalid socketID: ${socketID}`);
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
			this.clientSockets[socketID].send(message);
		}
	}

	public async onStake(clientWS: WebSocket, stake: IStake) {
		const logHeader = `[${moduleName}.onSetAccount]: `;
		const socketID = this.findSocketID(clientWS);
		if (socketID < 0)
			console.log(logHeader + `[${this.relayerID}]: Invalid socketID: ${socketID}`);
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
			this.clientSockets[socketID].send(message);
		}
	}

	public async updatePrice() {
		const logHeader = `[${moduleName}.updatePrice]: `;
		this.currentPrice = await this.fetchPrice();
		console.log(logHeader + `[${this.relayerID}]: Update price: ${this.currentPrice.price}`);
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

	public async commitPrice(option: any) {
		this.sk = this.sk;
		const contractWrapper2 = this.contractWrapper as any;
		// const currentPrice = await calculator.getPriceFix(option.base, option.quote);
		const gasPrice = (await contractWrapper2.getGasPrice()) || option.gasPrice;
		util.logInfo('gasPrice price ' + gasPrice + ' gasLimit is ' + option.gasLimit);
		return contractWrapper2.commitPrice(
			this.address,
			this.sk,
			this.currentPrice.price,
			Math.floor(this.currentPrice.ts / 1000),
			gasPrice,
			option.gasLimit
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
		const data = await util.get(url);
		switch (this.relayerID) {
			case 8001:
				this.currentPrice.price = JSON.parse(data).last;
				break;
			case 8002:
				this.currentPrice.price = JSON.parse(data).price;
				break;
			case 8003:
				this.currentPrice.price = JSON.parse(data)[6];
				break;
			default:
				break;
		}
		this.currentPrice.price = this.relayerID * 100000 + (moment.utc().valueOf() % 1000);
		this.currentPrice.ts = moment.utc().valueOf();
		return this.currentPrice;
	}

	public findSocketID(clientWS: WebSocket) {
		const logHeader = `[${moduleName}.findSocketID]: `;
		let socketID = -1;
		for (const id in this.clientSockets)
			if (this.clientSockets[id] === clientWS) socketID = Number(id);
		if (socketID < 0) console.log(logHeader + `In valid socketID: ${socketID}`);
		return socketID;
	}
}
