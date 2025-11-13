import {
	ethNetworks,
	rootNetworks,
	xrplNetworks,
} from "@trncs/balance-checker/libs/constants";
import type {
	EthNetworkType,
	IErrorLogs,
	ISetLowBalances,
	RootNetworkType,
	XrplNetworkType,
} from "@trncs/balance-checker/libs/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const isEthNetwork = (n: any): n is EthNetworkType =>
	ethNetworks.includes(n);
export const isRootNetwork = (n: any): n is RootNetworkType =>
	rootNetworks.includes(n);
export const isXrplNetwork = (n: any): n is XrplNetworkType =>
	xrplNetworks.includes(n);
/* eslint-enable @typescript-eslint/no-explicit-any */

export const isSetLowBalance = (o: unknown): o is Required<ISetLowBalances> =>
	typeof o === "object" &&
	o !== null &&
	"chain" in o &&
	"isMainnet" in o &&
	"balances" in o &&
	"network" in o &&
	"account" in o;

export const isErrorLog = (o: unknown): o is Required<IErrorLogs> =>
	typeof o === "object" &&
	o !== null &&
	"chain" in o &&
	"isMainnet" in o &&
	"message" in o;
