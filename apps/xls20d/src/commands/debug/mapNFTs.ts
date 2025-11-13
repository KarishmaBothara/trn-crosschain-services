import { createLogger } from "@subsquid/logger";

import { CsvParser } from "@trncs/utils/CsvParser";
import { ExtContext } from "@trncs/xls20d/commands/outbox/processRootSide";
import { fulfillMintRequests } from "@trncs/xls20d/mappings/outbox/handleNFTokenMintTx";
import { MintRequest } from "@trncs/xls20d/types";
import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/xls20d/utils/createSlackLogger";
import { getPrismaClient } from "@trncs/xls20d/utils/getPrismaClient";

export const command = "MapNFT";
export const desc = `Map NFT on TRN chain`;

export async function handler() {
	// Read from csv file and map on TRN
	const mintRequests = await new CsvParser<MintRequest>("mapNFTs").read();
	const slack = createSlackLogger(LoggerChannel.Outgoing, LoggerChild.Root);
	const store = await getPrismaClient();
	const log = createLogger("debug");
	const extCtx = { store, log: log, slack } as unknown as ExtContext;
	await fulfillMintRequests(extCtx, mintRequests);
	log.info("Successfully completed mapping on TRN");
	process.exit(1);
}
