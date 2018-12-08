import WebSocket from 'ws';
import * as CST from '../common/constants';
import { Dict, IRelayerInfo, IRelayerMessage, IStake } from '../common/types';

const moduleName = 'Client';
export default class Client {
	public relayers: Dict<string, WebSocket> = {};
	// public relayerPrices: Dict<string, IPrice> = {};
	public relayersInfo: Dict<string, IRelayerInfo> = {};
	// public userPK: string = '';
	public uiSocketServer: WebSocket.Server | null = null;
	public uiSocket: WebSocket | null = null;

	public account: string = '0x1';

	constructor() {
		const logHeader = `[${moduleName}.Contructor]: `;
		// this.userPK = userPK;
		this.uiSocketServer = new WebSocket.Server({
			port: CST.UI_SOCKET_PORT
		});
		if (this.uiSocketServer)
			this.uiSocketServer.on('connection', uiWS => {
				console.log(logHeader + 'Connected');
				uiWS.on('message', msg => {
					console.log(logHeader + `MsgFromUI: ${JSON.stringify(msg)}`);
					this.handleUIMessage(msg);
				});
				uiWS.on('close', () => {
					console.log(logHeader + `UI Socket closed`);
					this.uiSocket = null;
				});
				this.uiSocket = uiWS;
			});

		for (const relayerID of CST.RELAYER_PORTS) {
			const relayerWSLink = `ws://localhost:${relayerID}`;
			this.relayers[relayerID] = new WebSocket(relayerWSLink);
			this.relayers[relayerID].on('open', () => {
				// const message = {
				// 	op: 'subscribePrice',
				// 	data: {}
				// };
				// this.relayers[relayerID].send(JSON.stringify(message));
				this.relayers[relayerID].on('message', msg => {
					this.handleRelayerMessage(msg);
				});
				this.relayers[relayerID].on('close', () => {
					console.log(logHeader + `[${relayerID}]: Relayer Closed`);
				});
			});
		}
	}

	public handleRelayerMessage(msg: any) {
		const logHeader = `[${moduleName}.handleRelayerMessage]: `;
		const message: IRelayerMessage = JSON.parse(msg);
		switch (message.op) {
			case 'updatePrice':
				this.onRelayerPriceUpdate(message);
				break;
			case 'setAccount':
				this.onRelayerReplySetAccount(message);
				break;
			default:
				console.log(logHeader + `No such command: ${message.op} `);
				break;
			// this.uiSocket.send(JSON.stringify(msg.data));
		}
	}

	public onRelayerReplySetAccount(message: IRelayerMessage) {
		const logHeader = `[${moduleName}.onRelayerSetAccount]: `;
		const data = message.data;
		if (this.account !== data.accountID) {
			console.log(
				logHeader +
					`Error: Client Account: ${this.account} not equal Relayer Account ${
						data.accountID
					}`
			);
			console.log(logHeader + `Resending setAccount to relayer`);
			this.onUISetAccount({ accountID: this.account });
		} else {
			console.log(logHeader + `setAccount successful`);
			this.relayersInfo[data.relayerID] = data;
			const msgToUI = {
				op: 'update',
				relayerInfo: message.data
			};
			if (this.uiSocket) this.uiSocket.send(JSON.stringify(msgToUI));
		}
	}

	public onRelayerPriceUpdate(message: IRelayerMessage) {
		const logHeader = `[${moduleName}.onRelayerPriceUpdate]: `;
		const data = message.data;
		const relayerID = data.relayerID;
		this.relayersInfo[relayerID] = data;
		console.log(
			logHeader +
				`[${this.relayersInfo[relayerID].relayerID}]:${JSON.stringify(
					this.relayersInfo[relayerID]
				)}`
		);
		this.relayersInfo[data.relayerID] = data;
		const msgToUI = { op: 'update', relayersInfo: this.relayersInfo };
		if (this.uiSocket) this.uiSocket.send(JSON.stringify(msgToUI));
	}

	public handleUIMessage(msg: any) {
		const logHeader = `[${moduleName}.onUIMessage]:`;
		console.log(logHeader + msg);
		const message = JSON.parse(msg);
		switch (message.op) {
			case 'stake':
				this.onUIStake(message.data);
				break;
			case 'setAccount':
				this.onUISetAccount(message.data);
				// this.account = message.data.accountID
				break;
			default:
				console.log(logHeader + `No such command: ${message.op}`);
				break;
		}
		// switch (msg.op) {
		// 	// case 'subscribe':
		// 		// this.handleUISubscription();
		// 	// this.uiSocket.send(JSON.stringify(msg.data));
		// }
	}

	public onUISetAccount(data: { accountID: string }) {
		this.account = data.accountID;
		// const relayerID = stake.relayerID;
		const message = { op: 'setAccount', data: { accountID: this.account } };
		for (const relayerID in this.relayers)
			this.relayers[relayerID].send(JSON.stringify(message));
	}

	public onUIStake(stake: IStake) {
		const relayerID = stake.relayerID;
		const message = { op: 'stake', data: stake };
		this.relayers[relayerID].send(JSON.stringify(message));
	}

	// public handleUIStake(stake: IStake) {
	// 	const relayerWS = this.relayers[stake.relayerID];
	// 	const response = {
	// 		op: 'stake',
	// 		data: stake
	// 	};
	// 	relayerWS.send(JSON.stringify(response));
	// }
}
