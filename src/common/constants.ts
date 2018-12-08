export const CONTRACT_ADDRESS = '0xx';
export const NETWORK_ID_KOVAN = 42;
export const PROVIDER_INFURA_KOVAN = 'https://kovan.infura.io';

export const LOG_INFO = 'INFO';
export const LOG_DEBUG = 'DEBUG';
export const LOG_ERROR = 'ERROR';
export const LOG_RANKING: { [level: string]: number } = {
	[LOG_ERROR]: 0,
	[LOG_INFO]: 1,
	[LOG_DEBUG]: 2
};