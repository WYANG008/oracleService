export type Dict<keyType, valType> = keyType extends number
	? { [key: number]: valType }
	: (keyType extends string ? { [key: string]: valType } : undefined);

export interface IPrice {
	price: number;
	ts: number;
	relayerID: number;
}

export interface IStake {
	relayerID: string;
	// timestamp: number;
	stakeAmt: number;
	sign: string;
	// price: number;
}
