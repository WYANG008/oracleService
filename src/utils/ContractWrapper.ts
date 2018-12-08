import { Contract } from 'web3/types';
import util from './util';
// import Web3Util from './Web3Util';
import * as CST from '../common/constants';
import {
	//  IContractStates, 
	IOption } from '../common/types';
import Web3 from 'web3';
// import { resolve } from 'dns';
// const abiDecoder = require('abi-decoder');
const Tx = require('ethereumjs-tx');

export default class ContractWrapper {
	// public web3Util: Web3Util;
	public web3: Web3;
	public address: string;
	public abi: any[];
	public events: string[] = [];
	public contract: Contract;

	constructor(option: IOption) {
		console.log('start constructor');
		const abiFile = require('../static/abi.json');
		this.abi = abiFile.abi;
		// this.web3Util = new Web3Util(null, option);
		this.address = CST.CONTRACT_ADDR;
		const providerEngine = new Web3.providers.HttpProvider(option.provider)
		this.web3 = new Web3(
			providerEngine
		);
		// this.web3 = new Web3(option.provider);
		this.contract = new this.web3.eth.Contract(this.abi, this.address);
	
		console.log(option.provider);
	}

	public async sendTransactionRaw(
		address: string,
		privateKey: string,
		contractAddr: string,
		value: number,
		gasPrice: number,
		gasLimit: number,
		nonce: number,
		command: string
	) {
		nonce = nonce === -1 ? await this.web3.eth.getTransactionCount(address) : nonce;
		gasPrice = (await this.web3.eth.getGasPrice()) || gasPrice;
		this.web3.eth
			.sendSignedTransaction(
				this.signTx(
					this.createTxCommand(
						nonce,
						gasPrice,
						gasLimit,
						contractAddr,
						value,
						command
					),
					privateKey
				)
			)
			.then(receipt => util.logInfo(receipt))
			.catch(error => util.logInfo(error));
	}

	public signTx(rawTx: object, privateKey: string): string {
		try {
			const tx = new Tx(rawTx);
			tx.sign(new Buffer(privateKey, 'hex'));
			return tx.serialize().toString('hex');
		} catch (err) {
			util.logError(err);
			return '';
		}
	}

	public createTxCommand(
		nonce: number,
		gasPrice: number,
		gasLimit: number,
		toAddr: string,
		amount: number,
		data: string
	) {
		return {
			nonce, // web3.utils.toHex(nonce), //nonce,
			gasPrice: this.web3.utils.toHex(gasPrice),
			gasLimit: this.web3.utils.toHex(gasLimit),
			to: toAddr,
			value: this.web3.utils.toHex(this.web3.utils.toWei(amount.toString(), 'ether')),
			data
		};
	}

	
}
