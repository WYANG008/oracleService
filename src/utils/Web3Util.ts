// fix for @ledgerhq/hw-transport-u2f 4.28.0
import '@babel/polyfill';

import * as CST from '../common/constants';
import util from './util';

const Web3Eth = require('web3-eth');
const Web3Accounts = require('web3-eth-accounts');
const Web3Personal = require('web3-eth-personal');
const Web3Utils = require('web3-utils');

export enum Wallet {
	None,
	Local,
	MetaMask,
	Ledger
}

export default class Web3Util {
	public wallet: Wallet = Wallet.None;
	public accountIndex: number = 0;
	public networkId: number = CST.NETWORK_ID_KOVAN;
	private rawMetamaskProvider: any = null;
	private web3Eth: any = null;
	private web3Accounts: any = null;
	private web3Personal: any = null;

	constructor(window: any, live: boolean, privateKey: string, local: boolean) {
		this.networkId = CST.NETWORK_ID_KOVAN;
		if (window && (window.ethereum || window.web3)) {
			this.rawMetamaskProvider = window.ethereum || window.web3.currentProvider;
			this.web3Personal = new Web3Personal(this.rawMetamaskProvider);
			this.wallet = Wallet.MetaMask;
		} else {
	
			const infura = require('../keys/infura.json');
			const infuraProvider =
				CST.PROVIDER_INFURA_KOVAN +
				'/' +
				infura.token;
			
			this.web3Eth = new Web3Eth(infuraProvider);
			this.web3Personal = new Web3Eth(infuraProvider);
			
		}

		
	}


	public getTransactionCount(address: string) {
		return this.web3Eth.getTransactionCount(address);
	}

	public getGasPrice() {
		return this.web3Eth.getGasPrice();
	}


	public web3PersonalSign(account: string, message: string): Promise<string> {
		if (this.wallet !== Wallet.MetaMask) return Promise.reject();
		return this.web3Personal.sign(message, account);
	}

	public web3AccountsRecover(message: string, signature: string): string {
		if (!this.web3Accounts) return '';
		return this.web3Accounts.recover(message, signature);
	}

	public onWeb3AccountUpdate(onUpdate: (addr: string, network: number) => any) {
		if (this.wallet !== Wallet.MetaMask) return;

		const store = this.rawMetamaskProvider.publicConfigStore;
		if (store)
			store.on('update', () => {
				if (
					this.wallet === Wallet.MetaMask &&
					store.getState().selectedAddress &&
					store.getState().networkVersion
				)
					onUpdate(
						store.getState().selectedAddress,
						Number(store.getState().networkVersion)
					);
			});
	}

	public static toChecksumAddress(address: string): string {
		return Web3Utils.toChecksumAddress(address);
	}
}
