// fix for @ledgerhq/hw-transport-u2f 4.28.0
import '@babel/polyfill';
import Web3 from 'web3';
import { Contract, Signature } from 'web3/types';
import { IOption } from '../common/types';

import ContractWrapper from './ContractWrapper';
// import { , EventLog } from 'web3/types';
// import * as CST from '../common/constants';
// import util from './util';

// const Web3Eth = require('web3-eth');
// const Web3Accounts = require('web3-eth-accounts');
// const Web3Personal = require('web3-eth-personal');
// const Web3Utils = require('web3-utils');

export enum Wallet {
	None,
	Local,
	MetaMask,
	Ledger
}

export default class Web3Util {
	public web3: Web3;
	public contractWrapper: ContractWrapper;
	public wallet: Wallet = Wallet.None;
	public accountIndex: number = 0;
	// public provider: string;
	public web3Eth: any = null;
	public Web3Personal: any = null;

	constructor(window: any, option: IOption, contractWrapper: ContractWrapper) {
		this.contractWrapper = contractWrapper;

		// this.provider = provider;
		let providerEngine;
		if (window && (window.ethereum || window.web3)) {
			this.web3 = new Web3(window.ethereum || window.web3.currentProvider);
			this.wallet = Wallet.MetaMask;
		} else if (window) {
			this.web3 = new Web3(new Web3.providers.HttpProvider(option.provider));
			this.wallet = Wallet.None;
		} else {
			providerEngine = new Web3.providers.HttpProvider(option.provider);

			this.web3 = new Web3(providerEngine);

			this.wallet = Wallet.Local;
		}
		// this.web3Eth = new Web3Eth(providerEngine);
		// this.Web3Personal = new Web3Personal(providerEngine);
	}

	public createContract(abi: any[], address: string): Contract {
		return new this.web3.eth.Contract(abi, address);
	}

	public getGasPrice() {
		return this.web3Eth.getGasPrice();
	}

	public async sign(data: string, key: string): Promise<string | Signature> {
		return this.web3.eth.accounts.sign(data, key);
	}

	public async recover(message: string, v: string, r: string, s: string) {
		return this.web3.eth.accounts.recover(message, v, r, s);
	}

	public async getStates() {
		// const states = await this.contract.methods.getStates().call();
		const promiseList = [
			this.contractWrapper.contract.methods.period().call(),
			this.contractWrapper.contract.methods.mingRatio().call(),
			this.contractWrapper.contract.methods.openWindowTimeInSecond().call(),
			this.contractWrapper.contract.methods.lastPriceTimeInSecond().call(),
			this.contractWrapper.contract.methods.inceptionTimeInSecond().call()
			// this.contractWrapper.contract.
		];

		const results = await Promise.all(promiseList);
		console.log(results);
		return {
			period: results[0],
			mingRatio: results[1],
			openWindowTimeInSecond: results[2],
			lastPriceTimeInSecond: results[3],
			inceptionTimeInSecond: results[4]
		};
	}

	public async stake(address: string, amtInWei: number) {
		return this.contractWrapper.contract.methods.stake(amtInWei).send({
			from: address
		});
	}

	public async unStake(address: string, amtInWei: number) {
		return this.contractWrapper.contract.methods.unstake(amtInWei).send({
			from: address
		});
	}

	public async getStakedToken(address: string) {
		return this.contractWrapper.contract.methods.totalStakedAmt(address).call();
	}

	public async getListedCommitters() {
		const totalFeeders = await this.contractWrapper.contract.methods.totalFeeders().call();
		console.log(totalFeeders);
	}
	// uint public totalFeeders;
	// address[] feederLists;

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
