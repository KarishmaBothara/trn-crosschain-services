import type { NextApiRequest, NextApiResponse } from "next";

import { SHARED_KEY } from "@trncs/balance-checker/libs/constants";
import {
	sendErrorLogs,
	sendLowBalances,
} from "@trncs/balance-checker/libs/handlers";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { method, query } = req;

	switch (method) {
		case "GET": {
			// query.params:
			// - type
			// - key
			// - prod
			const [type, key, isprod] = query!.params as [
				type: string,
				key: string,
				isprod: string
			];

			if (!key || key !== SHARED_KEY || !type) {
				res.status(404).end();
				return;
			}
			// optional param, used for prod env only
			const isProduction = isprod === "prod" ? true : false;

			if (type === "balances") {
				console.log(`Sending low balance notification/s to Slack...`);
				await sendLowBalances(isProduction);
			} else if (type === "errors") {
				console.log(`Sending error notification/s to Slack...`);
				await sendErrorLogs(isProduction);
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
