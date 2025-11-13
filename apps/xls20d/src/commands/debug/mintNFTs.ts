import { createLogger } from "@subsquid/logger";

import { CsvParser } from "@trncs/utils/CsvParser";
import {
	ExtContext,
	MintRequestedArgs,
} from "@trncs/xls20d/commands/outbox/processRootSide";
import { handleIndividualRequest } from "@trncs/xls20d/mappings/outbox/handleXls20MintRequestEvent";
import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/xls20d/utils/createSlackLogger";
import { getPrismaClient } from "@trncs/xls20d/utils/getPrismaClient";

export const command = "MintNFT";
export const desc = `Mint NFT on XRPL chain"`;

export type MintRequestObj = {
	collectionId: number;
	serialId: number;
	tokenUri: string;
};

export async function handler() {
	// Read from csv file [collectionId, serialId, tokenURI] and mint on XRPL
	const mintRequests = await new CsvParser<MintRequestObj>("mintNFTs").read();
	const slack = createSlackLogger(LoggerChannel.Outgoing, LoggerChild.Root);
	const store = await getPrismaClient();
	const log = createLogger("debug");
	const localLog = log.child(`#${mintRequests[0]?.collectionId}`);
	const extCtx = { store, log: localLog, slack } as ExtContext;

	for (let i = 0; i < mintRequests.length; i++) {
		const { tokenUri, serialId, collectionId } = mintRequests[i];
		const tokenURI = `${tokenUri}${serialId}`;
		const args: MintRequestedArgs = {
			tokenUri: tokenURI,
			collectionId: collectionId,
			serialNumber: serialId,
		};
		await handleIndividualRequest(extCtx, args);
	}
	log.info("Successfully completed minting on XRPL");
	process.exit(1);
}
