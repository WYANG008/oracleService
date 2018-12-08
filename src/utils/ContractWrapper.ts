import { Contract } from 'web3/types';
import util from './util';
import Web3Util from './Web3Util';
import * as CST from '../common/constants';
import {
	// IContractStates, 
	IOption } from '../common/types';
// const abiDecoder = require('abi-decoder');

export default class ContractWrapper {
	public web3Util: Web3Util;
	public address: string
	public abi: any[];
	public events: string[] = [];
	public contract: Contract;

	constructor(option: IOption) {
		const abiFile = require('../static/abi.json');
		this.abi = abiFile.abi;
		this.web3Util = new Web3Util(null, option.source, option.provider );
		this.address = CST.CONTRACT_ADDR;
		this.contract = this.web3Util.createContract(this.abi, this.address);
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
		nonce = nonce === -1 ? await this.web3Util.web3.eth.getTransactionCount(address) : nonce;
		gasPrice = (await this.web3Util.web3.eth.getGasPrice()) || gasPrice;
		this.web3Util.web3.eth
			.sendSignedTransaction(
				this.web3Util.signTx(
					this.web3Util.createTxCommand(
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

	public async getStates() {
		// const states = await this.contract.methods.getStates().call();
		const promiseList = [
			this.contract.methods.period().call(),
			this.contract.methods.mingRatio().call(),
			this.contract.methods.openWindowTimeInSecond().call(),
			this.contract.methods.lastPriceTimeInSecond().call(),
			this.contract.methods.inceptionTimeInSecond().call(),
		];

		Promise.all(promiseList).then(res=>{
			res.map(e=>console.log(e));
		});
	}
}
