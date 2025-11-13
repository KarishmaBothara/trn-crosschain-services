import kv from "@vercel/kv";

import { IErrorLogs } from "@trncs/balance-checker/libs/types";
import {
	flattenArrayObject,
	isErrorLog,
	LoggerChannel,
	LoggerChild,
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
			await kv.hgetall("error:ethereum:goerli"),
			await kv.hgetall("error:ethereum:homestead"),
			await kv.hgetall("error:trn:porcini"),
			await kv.hgetall("error:trn:mainnet"),
			await kv.hgetall("error:xrpl:testnet"),
			await kv.hgetall("error:xrpl:livenet"),
		]);

		const logMsgPromises: Promise<void>[] = [];

		const errorLogs = flattenArrayObject(all);

		for (const errorLog of errorLogs) {
			const obj = errorLog as IErrorLogs;

			if (!isErrorLog(obj)) continue; // skip to the next iteration

			console.error(`\n${obj.message}`);

			// put the log messages into a promises var
			switch (obj.chain) {
				case "ethereum": {
					ethSlack.isMainnet = obj.isMainnet;
					logMsgPromises.push(ethSlack.error(obj.message));
					break;
				}
				case "trn": {
					trnSlack.isMainnet = obj.isMainnet;
					logMsgPromises.push(trnSlack.error(obj.message));
					break;
				}
				case "xrpl": {
					xrplSlack.isMainnet = obj.isMainnet;
					logMsgPromises.push(xrplSlack.error(obj.message));
					break;
				}
				default:
					break;
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
