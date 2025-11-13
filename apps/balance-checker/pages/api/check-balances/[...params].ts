import type { NextApiRequest, NextApiResponse } from "next";

import { SHARED_KEY } from "@trncs/balance-checker/libs/constants";
import {
	checkETHBalance,
	checkROOTBalance,
	checkXRPLBalance,
} from "@trncs/balance-checker/libs/handlers";
import type {
	EthNetworkType,
	IAccount,
	ParamsType,
	RootNetworkType,
	XrplNetworkType,
} from "@trncs/balance-checker/libs/types";
import {
	getJSONFile,
	isEthNetwork,
	isRootNetwork,
	isXrplNetwork,
} from "@trncs/balance-checker/libs/utils";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { method, query } = req;

	const ACCOUNTS_TOKENS = await getJSONFile();

	switch (method) {
		case "GET": {
			// query.params:
			// - chain
			// - network
			// - key
			const [chain, network, key] = query!.params as unknown as ParamsType;

			if (!key || key !== SHARED_KEY || !chain || !network) {
				res.status(404).end();
				return;
			}

			const c = chain!.toString().toLowerCase();
			const n = network!.toString().toLowerCase();

			console.log(`Processing ${c}:${n} account balance check...`);
			if (c === "ethereum" && isEthNetwork(n)) {
				const { isMainnet, accounts, tokens } =
					ACCOUNTS_TOKENS[c][n as EthNetworkType];
				await checkETHBalance(
					isMainnet,
					network,
					accounts as IAccount[],
					tokens
				);
			} else if (c === "trn" && isRootNetwork(n)) {
				const { isMainnet, accounts, tokens } =
					ACCOUNTS_TOKENS[c][n as RootNetworkType];
				await checkROOTBalance(
					isMainnet,
					network,
					accounts as IAccount[],
					tokens
				);
			} else if (c === "xrpl" && isXrplNetwork(n)) {
				const { isMainnet, accounts, tokens } =
					ACCOUNTS_TOKENS[c][n as XrplNetworkType];
				await checkXRPLBalance(
					isMainnet,
					network,
					accounts as IAccount[],
					tokens
				);
			} else {
				res.status(404).end();
				return;
			}

			res.status(200).end();
			console.log(`\n... done.`);
			break;
		}
		default: {
			res.setHeader("Allow", ["GET"]);
			res.status(405).end(`Method ${method} Not Allowed`);
			break;
		}
	}
}
