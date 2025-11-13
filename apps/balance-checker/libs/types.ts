import type { KnownBlock } from "@slack/types";

import {
	chains,
	ethNetworks,
	rootNetworks,
	xrplNetworks,
} from "@trncs/balance-checker/libs/constants";

export type ChainType = (typeof chains)[number];
export type EthNetworkType = (typeof ethNetworks)[number];
export type RootNetworkType = (typeof rootNetworks)[number];
export type XrplNetworkType = (typeof xrplNetworks)[number];

export interface IEthTokens {
	ETH: Record<string, never>;
}
interface IRootTokenMetadata {
	assetId: number;
	decimals: number;
}
export interface IRootTokens {
	XRP: IRootTokenMetadata;
	ROOT: IRootTokenMetadata;
	ASTO: IRootTokenMetadata;
	SYLO: IRootTokenMetadata;
	ETH: IRootTokenMetadata;
}
export interface IXrplTokens {
	XRP: Record<string, never>;
	"ZRP": Record<string, never>;
	"524F4F5400000000000000000000000000000000": Record<string, never>;
	"53594C4F00000000000000000000000000000000": Record<string, never>;
	"4153544F00000000000000000000000000000000": Record<string, never>;
	"5553444300000000000000000000000000000000": Record<string, never>;
	"5553445400000000000000000000000000000000": Record<string, never>;
}

export type ParamsType = [
	chain: ChainType,
	network: EthNetworkType | RootNetworkType | XrplNetworkType,
	key: string
];

export interface IColors {
	info: string;
	warn: string;
	error: string;
	fatal: string;
}
export type ColorsType = "info" | "warn" | "error" | "fatal";

export type ETHROOTAddress = `0x${string}`;
export type XRPLAddress = `r${string}`;
export type XRPLNonXRPToken = {issuer: string, value: number};
export interface IAccount {
	alias?: string;
	address: ETHROOTAddress | XRPLAddress;
	tokenThresholds: {
		[key: string]: number |	XRPLNonXRPToken;
	};
}

export interface IBalance {
	token: string;
	formattedBalance: string;
	isLowBalance: boolean;
}

export interface ISlackPayload {
	blocks: KnownBlock[];
	channel: string;
	text: string;
	attachments?: {
		color: string;
		fields: {
			title: string;
			value: string;
			short: boolean;
		}[];
	}[];
}

export interface ISetLowBalances {
	chain: string;
	balances: IBalance[];
	isMainnet: boolean;
	network: string;
	account: { alias?: string; address: string };
}

export interface IErrorLogs {
	message: string;
	chain: string;
	isMainnet: boolean;
}
