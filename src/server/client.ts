import WebSocket from 'ws';
import * as CST from '../common/constants';
import { Dict, IPrice } from '../common/types';

const moduleName = 'Client';
export default class Client {
	public relayers: Dict<string, WebSocket> = {};
	public relayerPrices: Dict<string, IPrice> = {};
	// public userPK: string = '';
	public uiSocketServer: WebSocket.Server | null = null;
	public uiSocket: WebSocket | null = null;

	constructor() {
		const logHeader = `[${moduleName}.Contructor]: `;
		// this.userPK = userPK;
		this.uiSocketServer = new WebSocket.Server({ port: CST.UI_SOCKET_PORT });
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
		const message = JSON.parse(msg);
		switch (message.op) {
			case 'updatePrice':
				this.onRelayerPriceUpdate(message.data);
				if (this.uiSocket) this.uiSocket.send(JSON.stringify(this.relayerPrices));
				break;
			default:
				console.log(logHeader + `No such command: ${message.op} `);
				break;
			// this.uiSocket.send(JSON.stringify(msg.data));
		}
	}

	public onRelayerPriceUpdate(newPrice: any) {
		const logHeader = `[${moduleName}.onRelayerPriceUpdate]: `;
		const price = newPrice as IPrice;
		this.relayerPrices[price.relayerID] = price;

		console.log(
			logHeader +
				`[${this.relayerPrices[price.relayerID].relayerID}]:${JSON.stringify(
					this.relayerPrices[price.relayerID]
				)}`
		);
	}

	public handleUIMessage(msg: any) {
		const logHeader = `[${moduleName}.onUIMessage]:`;
		console.log(logHeader + msg);
		const message = JSON.parse(msg);
		switch (message.op) {
			case 'stake':
				const relayerID = msg.data;
				this.relayers[relayerID].send(JSON.stringify(message));
		}
		// switch (msg.op) {
		// 	// case 'subscribe':
		// 		// this.handleUISubscription();
		// 	// this.uiSocket.send(JSON.stringify(msg.data));
		// }
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
