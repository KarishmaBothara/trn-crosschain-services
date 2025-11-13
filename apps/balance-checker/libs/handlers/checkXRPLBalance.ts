import kv from "@vercel/kv";
import { Client } from "xrpl";

import { NETWORK } from "@trncs/balance-checker/libs/constants";
import type {
	IAccount,
	IBalance,
	ISetLowBalances,
	IXrplTokens,
	XrplNetworkType,
} from "@trncs/balance-checker/libs/types";
import {XRPLNonXRPToken} from "@trncs/balance-checker/libs/types";

const CHAIN_NAME = "xrpl";

export default async function checkXRPLBalance(
	isMainnet: boolean,
	network: string,
	accounts: IAccount[],
	tokens: IXrplTokens
) {
	const wsURL = NETWORK.xrpl[network as XrplNetworkType].ApiUrl.InWS;
	const client = new Client(wsURL);

	try {
		await client.connect();

		// remove previously set key and values from KV
		await Promise.all([
			kv.del(`${CHAIN_NAME}:${network}`),
			kv.del(`error:${CHAIN_NAME}:${network}`),
		]);

		const lowBalancePromises: Promise<number>[] = [];
		const errorMsgPromises: Promise<number>[] = [];

		for (const account of accounts) {
			let balances: IBalance[] = [];
			try {
				balances = await Promise.all(
					Object.entries(tokens)
						.filter(([key]) => !!account.tokenThresholds[key])
						.map(async ([key]) => {
							const balanceDetail: Array<{
								value: string;
								currency: string;
								issuer?: string | undefined;
							}> = await client.getBalances(
								account.address
							);
							let formattedBalance;
							if ( key === 'XRP') {
								formattedBalance = balanceDetail?.find(b => b.currency === "XRP")?.value  || '0';
							} else {
								const tokenBalance = balanceDetail?.find(b => b.currency === key && b.issuer === (account.tokenThresholds[key] as XRPLNonXRPToken).issuer);
								formattedBalance = tokenBalance?.value  || '0';
							}
							const balance = parseFloat(formattedBalance);
							const threshold = key === 'XRP' ? account.tokenThresholds[key] ?? 0 : (account.tokenThresholds[key] as XRPLNonXRPToken).value;
							const isLowBalance = balance <= threshold;
							return {
								token: key,
								formattedBalance,
								isLowBalance,
							};
						})
				);
			} catch (error: unknown) {
				const { message } = error as { message: string };

				const fieldname = "getbalances";
				// set the error msg to the KV store
				errorMsgPromises.push(
					kv.hset(`error:${CHAIN_NAME}:${network}`, {
						[`${fieldname}:${account.address}`]: {
							message: `Error on '${CHAIN_NAME}:${network}:${fieldname}':\n\n${message}`,
							chain: CHAIN_NAME,
							isMainnet,
						},
					})
				);
			}

			try {
				const filteredLowBalances = balances.filter((obj) => obj.isLowBalance);
				if (filteredLowBalances.length) {
					const lbObj: ISetLowBalances = {
						chain: CHAIN_NAME,
						balances: filteredLowBalances,
						isMainnet,
						network,
						account: {
							address: account.address,
							alias: account.alias,
						},
					};
					// if has low balance, only add the token with low balance to the KV store
					lowBalancePromises.push(
						kv.hset(`${CHAIN_NAME}:${network}`, {
							[account.address]: lbObj,
						})
					);
				}
			} catch (error: unknown) {
				const { message } = error as { message: string };

				const fieldname = "setlowbalances";
				// set the error msg to the KV store
				errorMsgPromises.push(
					kv.hset(`error:${CHAIN_NAME}:${network}`, {
						[`${fieldname}:${account.address}`]: {
							message: `Error on '${CHAIN_NAME}:${network}:${fieldname}':\n\n${message}`,
							chain: CHAIN_NAME,
							isMainnet,
						},
					})
				);
			}
		}

		await Promise.all(lowBalancePromises);
		if (errorMsgPromises.length) await Promise.all(errorMsgPromises);
	} catch (error: unknown) {
		const { message } = error as { message: string };

		const fieldname = "catchallerrors";
		// set the error msg to the KV store
		kv.hset(`error:${CHAIN_NAME}:${network}`, {
			[fieldname]: {
				message: `Error on '${CHAIN_NAME}:${network}:${fieldname}':\n\n${message}`,
				chain: CHAIN_NAME,
				isMainnet,
			},
		});
	} finally {
		client.disconnect();
	}
}
