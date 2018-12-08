export type Dict<keyType, valType> = keyType extends number
	? { [key: number]: valType }
	: (keyType extends string ? { [key: string]: valType } : undefined);

export interface IPrice {
	price: number;
	ts: number;
	// relayerID: number;
}

export interface IStake {
	relayerID: string;
	// userPK: string;
	accountAddress: string;
	timestamp: number;
	stakeAmt: number;
	sign: string;
	// price: number;
}

export interface IRelayerInfo extends IPrice {
	relayerID: number;
	accountId: string;
	stakedAmt: number;
}

export interface IRelayerMessage {
	op: string;
	status: string;
	data: IRelayerInfo;
}

export interface IOption {
	source: string;
}
