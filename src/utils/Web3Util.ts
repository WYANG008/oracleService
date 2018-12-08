// fix for @ledgerhq/hw-transport-u2f 4.28.0
import '@babel/polyfill';
import Web3 from 'web3';
// import * as CST from '../common/constants';
// import util from './util';

const Web3Eth = require('web3-eth');
// const Web3Accounts = require('web3-eth-accounts');
const Web3Personal = require('web3-eth-personal');
// const Web3Utils = require('web3-utils');

export enum Wallet {
	None,
	Local,
	MetaMask,
	Ledger
}

export default class Web3Util {
	public web3: Web3;
	public wallet: Wallet = Wallet.None;
	public accountIndex: number = 0;
	public provider: string;
	public web3Eth: any = null;
	public Web3Personal: any = null;

	constructor(window: any, source: string, provider: string) {

		this.provider = provider;
		let providerEngine;
		if (window && (window.ethereum || window.web3)) {
			this.web3 = new Web3(window.ethereum || window.web3.currentProvider);
			this.wallet = Wallet.MetaMask;
		} else if (window) {
			this.web3 = new Web3(new Web3.providers.HttpProvider(provider));
			this.wallet = Wallet.None;
		} else {
			providerEngine = source
			? new Web3.providers.HttpProvider(provider)
			: new Web3.providers.WebsocketProvider(provider)
			this.web3 = new Web3(
				provider
			);
			
			this.wallet = Wallet.Local;
		}
		this.web3Eth = new Web3Eth(providerEngine);
		this.Web3Personal = new Web3Personal(providerEngine);
	}


	public getGasPrice() {
		return this.web3Eth.getGasPrice();
	}

	public sign(data: string, key: string) {
		return this.web3.eth.accounts.sign(data, key);
	}

	// public web3PersonalSign(account: string, message: string): Promise<string> {
	// 	if (this.wallet !== Wallet.MetaMask) return Promise.reject();
	// 	return this.web3Personal.sign(message, account);
	// }

	// public web3AccountsRecover(message: string, signature: string): string {
	// 	if (!this.web3Accounts) return '';
	// 	return this.web3Accounts.recover(message, signature);
	// }

	// public onWeb3AccountUpdate(onUpdate: (addr: string, network: number) => any) {
	// 	if (this.wallet !== Wallet.MetaMask) return;

	// 	const store = this.rawMetamaskProvider.publicConfigStore;
	// 	if (store)
	// 		store.on('update', () => {
	// 			if (
	// 				this.wallet === Wallet.MetaMask &&
	// 				store.getState().selectedAddress &&
	// 				store.getState().networkVersion
	// 			)
	// 				onUpdate(
	// 					store.getState().selectedAddress,
	// 					Number(store.getState().networkVersion)
	// 				);
	// 		});
	// }

	// public static toChecksumAddress(address: string): string {
	// 	return Web3Utils.toChecksumAddress(address);
	// }
}
