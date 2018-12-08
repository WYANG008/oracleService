import moment from 'moment';
import WebSocket from 'ws';

// import tradingUtil from './tradingUtil';
import { Dict, IPrice, IRelayerMessage, IStake } from '../common/types';
// import moment = require('moment');

// import util from './util';

// import { IncomingMessage } from 'http';

const moduleName = 'Relayer';
export default class Relayer {
	public wss: WebSocket.Server | null = null;
	public relayerID: number = 0;

	public stakes: Dict<string, IStake> = {};

	public socketIDs: number = 0;
	public clientSockets: Dict<number, WebSocket> = {};
	public clientSocketToAccountMapping: Dict<string, string> = {};

	public currentPrice: IPrice = { price: this.relayerID, ts: 0 };

	constructor(relayerID: number) {
		const logHeader = `[${moduleName}.startServer]: `;
		this.relayerID = relayerID;
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
				// ws.send(`stake`);
				this.onStake(clientWS, data as IStake);
				break;
			case 'setAccount':
				this.onSetAccount(clientWS, data as {
					accountID: string;
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

	public async onSetAccount(clientWS: WebSocket, data: { accountID: string }) {
		const logHeader = `[${moduleName}.onSetAccount]: `;
		const socketID = this.findSocketID(clientWS);
		if (socketID < 0) console.log(logHeader + `Invalid socketID: ${socketID}`);
		else {
			this.clientSocketToAccountMapping[socketID] = data.accountID;
			console.log(
				logHeader +
					`[${this.relayerID}]: Socket ${socketID} is mapped to account ${data.accountID}`
			);
			const accountID = this.clientSocketToAccountMapping[socketID];
			const message = {
				op: 'setAccount',
				status: 'successful',
				data: this.getRelayerInfo(accountID)
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
			const accountID = this.clientSocketToAccountMapping[socketID];
			const message: IRelayerMessage = {
				op: 'stake',
				status: 'successful',
				data: this.getRelayerInfo(accountID)
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
				const accountID = this.clientSocketToAccountMapping[socketID];
				const message = {
					op: 'updatePrice',
					status: 'successful',
					data: this.getRelayerInfo(accountID)
				};
				this.clientSockets[socketID].send(JSON.stringify(message));
			}
	}

	public getRelayerInfo(accountID: string) {
		let stakedAmt = 0;
		if (accountID && this.stakes[accountID]) stakedAmt = this.stakes[accountID].stakeAmt;
		return Object.assign(this.currentPrice, {
			relayerID: this.relayerID,
			stakedAmt: stakedAmt,
			accountID: !accountID ? '' : accountID
		});
	}

	public startNewRound() {
		this.stakes = {};
		for (const clientWS of Object.values(this.clientSockets)) clientWS.send('startNewRound');
	}

	public async fetchPrice() {
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

// const oracleSvcUtil = new OracleSvcUtil();
// export default oracleSvcUtil;

// public composeMessage(args: IStake) {
// 	return JSON.stringify(args);
// }

// public async handleNewOrder(ws: WebSocket, newOrder: INewOrder) {
// 	const logHeader = `[${moduleName}.handleNewOrder]: `;
// 	const src = newOrder.source;
// 	const api = tradingApis[src];
// 	let activeOrders = await this.loadActiveOrders(src);
// 	util.logDebug(
// 		logHeader +
// 			`${activeOrders.length} Active Orders: ${JSON.stringify(
// 				activeOrders.map(o => o.orderID)
// 			)}`
// 	);

// 	const addedOrder = await api.newOrder(newOrder);
// 	util.logDebug(logHeader + addedOrder.orderID + ' added');

// 	activeOrders = await this.loadActiveOrders(src);
// 	util.logDebug(
// 		logHeader +
// 			`${activeOrders.length} Active Orders: ${JSON.stringify(
// 				activeOrders.map(o => o.orderID)
// 			)}`
// 	);

// 	ws.send(JSON.stringify(addedOrder));
// }

// public async handleCancelOrder(
// 	ws: WebSocket,
// 	cancelOrder: { source: string; orderID: string[] }
// ) {
// 	const logHeader = `[${moduleName}.handleCancelOrder]: `;
// 	const src = cancelOrder.source;
// 	const api = tradingApis[src];
// 	let activeOrders = await this.loadActiveOrders(src);
// 	console.log(cancelOrder);
// 	util.logDebug(
// 		logHeader +
// 			`${activeOrders.length} Active Orders: ${JSON.stringify(
// 				activeOrders.map(o => o.orderID)
// 			)}`
// 	);

// 	const canceledOrder = await api.cancelOrder(cancelOrder);
// 	util.logDebug(logHeader + canceledOrder.orderID + ' canceled');

// 	activeOrders = await this.loadActiveOrders(src);
// 	util.logDebug(
// 		logHeader +
// 			`${activeOrders.length} Active Orders: ${JSON.stringify(
// 				activeOrders.map(o => o.orderID)
// 			)}`
// 	);

// 	ws.send(JSON.stringify(canceledOrder));
// }

// public async handleEditOrder(ws: WebSocket, editOrder: IEditOrder) {
// 	const logHeader = `[${moduleName}.handleEditOrder]: `;
// 	const src = editOrder.source;
// 	const api = tradingApis[src];
// 	let activeOrders = await this.loadActiveOrders(src);
// 	util.logDebug(
// 		logHeader +
// 			`${activeOrders.length} Active Orders: ${JSON.stringify(
// 				activeOrders.map(o => o.orderID)
// 			)}`
// 	);

// 	const editedOrder = await api.editOrder(editOrder);
// 	util.logDebug(logHeader + editedOrder.orderID + ' edited');

// 	const orderToEdit = activeOrders.filter(order => order.orderID === editedOrder.orderID)[0];
// 	util.logDebug(
// 		logHeader +
// 			[
// 				orderToEdit.price,
// 				orderToEdit.stopPx,
// 				orderToEdit.orderQty,
// 				orderToEdit.leavesQty
// 			].join(', ')
// 	);
// 	util.logDebug(
// 		logHeader +
// 			[
// 				editedOrder.price,
// 				editedOrder.stopPx,
// 				editedOrder.orderQty,
// 				editedOrder.leavesQty
// 			].join(', ')
// 	);

// 	activeOrders = await this.loadActiveOrders(src);
// 	util.logDebug(
// 		logHeader +
// 			`${activeOrders.length} Active Orders: ${JSON.stringify(
// 				activeOrders.map(o => o.orderID)
// 			)}`
// 	);

// 	ws.send(JSON.stringify(editedOrder));
// }

// public async loadOrders(source: string) {
// 	const logHeader = `[${moduleName}.loadOrders]: `;
// 	let orders: any[] = [];
// 	const api = tradingApis[source];
// 	if (!api) util.logError(logHeader + `No api for ${source}`);
// 	else {
// 		const start = moment
// 			.utc()
// 			.startOf('month')
// 			// .add(-1, 'month')
// 			.valueOf();
// 		const end = moment
// 			.utc()
// 			.startOf('month')
// 			// .add(-1, 'month')
// 			.endOf('month')
// 			.valueOf();
// 		orders = await api.loadOrdersREST([], start, end);
// 	}
// 	return orders;
// }

// public async loadActiveOrders(source: string) {
// 	// const logHeader = `[${moduleName}.loadOrders]: `;
// 	const allHistoricalOrders = await this.loadOrders(source);
// 	const activeOrders = allHistoricalOrders.filter(order => order.leavesQty > 0);
// 	return activeOrders;
// }

// public async loadOrders(option: IOption) {
// 	const logHeader = `[${moduleName}.loadOrders]: `;
// 	let orders: any[] = [];
// 	if (!option.source)
// 		util.logError(logHeader + `Source not specified. Please specify source`);
// 	else if (!this.tradingApis[option.source])
// 		util.logError(logHeader + `No api for ${option.source}`);
// 	else {
// 		const api = this.tradingApis[option.source];
// 		const start = moment
// 			.utc()
// 			.startOf('month')
// 			// .add(-1, 'month')
// 			.valueOf();
// 		const end = moment
// 			.utc()
// 			.startOf('month')
// 			// .add(-1, 'month')
// 			.endOf('month')
// 			.valueOf();
// 		orders = await api.loadOrdersREST([], start, end);
// 	}
// 	return orders;
// }

// public handleSubscription(ws: WebSocket, channel: string) {}

// public handleRequest(ws: WebSocket, data: object) {}
