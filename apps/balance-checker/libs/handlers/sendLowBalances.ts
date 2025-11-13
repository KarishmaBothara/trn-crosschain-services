import kv from "@vercel/kv";

import type { ISetLowBalances } from "@trncs/balance-checker/libs/types";
import {
	flattenArrayObject,
	isSetLowBalance,
	LoggerChannel,
	LoggerChild,
	prepareLowBalanceMsg,
	SlackLogger,
} from "@trncs/balance-checker/libs/utils";

export default async function sendLowBalances(isProd?: boolean) {
	const ethSlack = new SlackLogger(
		"BALANCE_CHECKER",
		LoggerChannel.BalanceCheck,
		LoggerChild.Ethereum
	);

	const trnSlack = new SlackLogger(
		"BALANCE_CHECKER",
		LoggerChannel.BalanceCheck,
		LoggerChild.Root
	);

	const xrplSlack = new SlackLogger(
		"BALANCE_CHECKER",
		LoggerChannel.BalanceCheck,
		LoggerChild.Xrpl
	);

	const slack = new SlackLogger(
		"BALANCE_CHECKER",
		LoggerChannel.BalanceCheck,
		LoggerChild.Any,
		isProd
	);

	try {
		// get all the identified accounts with low balances from KV store
		const all = await Promise.all([
			await kv.hgetall("ethereum:goerli"),
			await kv.hgetall("ethereum:homestead"),
			await kv.hgetall("trn:porcini"),
			await kv.hgetall("trn:mainnet"),
			await kv.hgetall("xrpl:testnet"),
			await kv.hgetall("xrpl:livenet"),
		]);

		const logMsgPromises: Promise<void>[] = [];

		const lowBalances = flattenArrayObject(all);

		for (const lowBalance of lowBalances) {
			const obj = lowBalance as ISetLowBalances;

			if (!isSetLowBalance(obj)) continue; // skip to the next iteration

			const logMsg = prepareLowBalanceMsg(
				obj.balances,
				obj.isMainnet,
				obj.network,
				obj.account
			);

			if (logMsg) {
				console.warn(`\n${logMsg}`);

				// put the log messages into a promises var
				switch (obj.chain) {
					case "ethereum": {
						ethSlack.isMainnet = obj.isMainnet;
						logMsgPromises.push(ethSlack.warn(logMsg));
						break;
					}
					case "trn": {
						trnSlack.isMainnet = obj.isMainnet;
						logMsgPromises.push(trnSlack.warn(logMsg));
						break;
					}
					case "xrpl": {
						xrplSlack.isMainnet = obj.isMainnet;
						logMsgPromises.push(xrplSlack.warn(logMsg));
						break;
					}
					default:
						break;
				}
			}
		}

		// then, send log messages to Slack
		await Promise.all(logMsgPromises);
	} catch (error: unknown) {
		const { message } = error as { message: string };

		const msg = `Error on 'sendnotifications':\n\n${message}`;
		await slack.fatal(msg);
		console.error(error);
	}
}
