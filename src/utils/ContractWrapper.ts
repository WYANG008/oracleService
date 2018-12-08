import { Contract } from 'web3/types';
import util from './util';
// import Web3Util from './Web3Util';
import * as CST from '../common/constants';
import {
	//  IContractStates,
	IOption
} from '../common/types';
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
		const abiFile = require('../static/abi.json');
		this.abi = abiFile.abi;
		// this.web3Util = new Web3Util(null, option);
		this.address = CST.CONTRACT_ADDR;
		const providerEngine = new Web3.providers.HttpProvider(option.provider);
		this.web3 = new Web3(providerEngine);
		// this.web3 = new Web3(option.provider);
		this.contract = new this.web3.eth.Contract(this.abi, this.address);
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
					this.createTxCommand(nonce, gasPrice, gasLimit, contractAddr, value, command),
					privateKey
				)
			)
			.then(receipt => util.logInfo(receipt))
			.catch(error => {
				console.log(error);
			});
	}

	public signTx(rawTx: object, privateKey: string): string {
		try {
			const tx = new Tx(rawTx);
			tx.sign(new Buffer(privateKey, 'hex'));
			const res = '0x' + tx.serialize().toString('hex');
			return res;
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

	public async startOracleRaw(
		address: string,
		privateKey: string,
		startTime: number,
		// whiteList: string[],
		gasPrice: number,
		gasLimit: number,
		nonce: number = -1
	) {
		console.log(startTime);
		util.logInfo(`the account ${address} is starting Oracle`);
		nonce = nonce === -1 ? await this.web3.eth.getTransactionCount(address) : nonce;
		const abi = {
			type: 'function',
			inputs: [
				{
					name: 'startTime',
					type: 'uint256'
				}
			],
			name: 'startOracle'
		};
		const input = [startTime];

		const command = this.generateTxString(abi, input);
		console.log(command);
		await this.sendTransactionRaw(
			address,
			privateKey,
			this.address,
			0,
			gasPrice,
			gasLimit,
			nonce,
			command
		);
	}

	public async addWhiteListRaw(
		address: string,
		privateKey: string,
		addr: string,
		gasPrice: number,
		gasLimit: number,
		nonce: number = -1
	) {
		util.logInfo(`the account ${address} is starting Oracle`);
		nonce = nonce === -1 ? await this.web3.eth.getTransactionCount(address) : nonce;
		const abi = {
			inputs: [
				{
					name: 'addr',
					type: 'address'
				}
			],
			name: 'addWhiteList',
			outputs: [
				{
					name: '',
					type: 'bool'
				}
			]
		};
		const input = [addr];

		const command = this.generateTxString(abi, input);
		console.log(command);
		await this.sendTransactionRaw(
			address,
			privateKey,
			this.address,
			0,
			gasPrice,
			gasLimit,
			nonce,
			command
		);
	}

	public generateTxString(abi: object, input: any[]): string {
		return this.web3.eth.abi.encodeFunctionCall(abi, input);
	}
}
