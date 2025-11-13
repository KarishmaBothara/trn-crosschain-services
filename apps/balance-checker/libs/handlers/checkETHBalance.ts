import kv from "@vercel/kv";
import { ethers } from "ethers";

import type {
	EthNetworkType,
	IAccount,
	IBalance,
	IEthTokens,
	ISetLowBalances,
} from "@trncs/balance-checker/libs/types";
import { getEthersProvider } from "@trncs/balance-checker/libs/utils";

const CHAIN_NAME = "ethereum";

export default async function checkETHBalance(
	isMainnet: boolean,
	network: string,
	accounts: IAccount[],
	tokens: IEthTokens
) {
	try {
		const provider = getEthersProvider(network as EthNetworkType);

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
							const balance: bigint = await provider.getBalance(
								account.address
							);
							const formattedBalance = ethers.formatEther(balance);
							const threshold: bigint = ethers.parseEther(
								(account.tokenThresholds[key] ?? 0).toString()
							);
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
	}
}
