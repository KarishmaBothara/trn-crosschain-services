import { u8aToString } from "@polkadot/util";
import {
	BatchContext,
	BatchProcessorItem,
	SubstrateBlock,
} from "@subsquid/substrate-processor";
import { EventItem } from "@subsquid/substrate-processor/lib/interfaces/dataSelection";

import {
	EthBridgeEventSendEvent,
	Xls20Xls20MintRequestEvent,
} from "@trncs/specs/generated/events";
import { EthySigningRequest_XrplTx } from "@trncs/specs/generated/v62";
import { createSubstrateProcessor } from "@trncs/utils/createSubstrateProcessor";
import { fetchFinalisedHead } from "@trncs/utils/fetchFinalisedHead";
import { waitFor } from "@trncs/utils/waitFor";
import { archiveEndpoint } from "@trncs/xls20d/config";
import { handleEventSendEvent } from "@trncs/xls20d/mappings/outbox/handleEventSendEvent";
import { handleXls20MintRequestEvent } from "@trncs/xls20d/mappings/outbox/handleXls20MintRequestEvent";
import { StatusCollection } from "@trncs/xls20d/types";
import {
	createMongoDatabase,
	Store,
} from "@trncs/xls20d/utils/createMongoDatabase";
import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/xls20d/utils/createSlackLogger";
import { getPrismaClient } from "@trncs/xls20d/utils/getPrismaClient";
import { getRootApi } from "@trncs/xls20d/utils/getRootApi";

export const command = "processRootSide";
export const desc = `Process outgoing events from "NFT"`;

const eventOptions = {
	data: {
		event: {
			args: true,
			extrinsic: {
				signature: true,
			},
		},
	},
} as const;
const slack = createSlackLogger(LoggerChannel.Outgoing, LoggerChild.Root);
const processor = createSubstrateProcessor(archiveEndpoint)
	.addEvent("Xls20.Xls20MintRequest", eventOptions)
	.addEvent("EthBridge.EventSend", eventOptions);

export type EventSendArgs = InstanceType<
	typeof EthBridgeEventSendEvent
>["asV62"] & { signingRequest: EthySigningRequest_XrplTx };
export type EventSendItem = EventItem<
	"EthBridge.EventSend",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

type Item = BatchProcessorItem<typeof processor>;
type Context = BatchContext<Store, Item>;

export type ExtContext = Context & {
	slack: typeof slack;
	index: number;
};

export type MintRequestedArgs = {
	tokenUri: string;
	serialNumber: number;
	collectionId: number;
};

export type MintRequestArgs = InstanceType<
	typeof Xls20Xls20MintRequestEvent
>["asV62"];

export async function handler() {
	const [rootApi, prismaClient] = await Promise.all([
		getRootApi(),
		getPrismaClient(),
	]);
	console.info(`
Channel: Outgoing
Network: Root
`);
	(processor as ReturnType<typeof createSubstrateProcessor>)
		.setInitialBlockHeight(await fetchFinalisedHead(rootApi))
		.run(
			createMongoDatabase(
				prismaClient,
				StatusCollection.ObxRootStatus,
				"XLS20D"
			),
			async (ctx: Context) => {
				const { blocks, _chain, log } = ctx;
				const extCtx = { ...ctx, slack } as ExtContext;
				try {
					for (const { header, items } of blocks) {
						log.info(`header height:${header.height}`);
						for (const [index, item] of items.entries()) {
							switch (item.name) {
								case "Xls20.Xls20MintRequest": {
									const args: MintRequestArgs = _chain.decodeEvent(item.event);
									const { collectionId, serialNumbers, tokenUris } = args;
									const tokenUriStr = tokenUris.map((tokenUri) =>
										u8aToString(tokenUri)
									);
									await handleXls20MintRequestEvent(
										collectionId,
										serialNumbers,
										tokenUriStr,
										extCtx,
										header.height
									);
									break;
								}
								// Event with event proof to create nft offer or accept nft offer
								case "EthBridge.EventSend": {
									const args: EventSendArgs = _chain.decodeEvent(item.event);
									if (args.signingRequest.__kind !== "XrplTx") break;
									await handleEventSendEvent(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}
							}
						}
					}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} catch (error: any) {
					log.fatal(error?.message ?? error);
					slack.fatal(error?.message ?? error);
					await prismaClient.$disconnect();
					if (error?.message === "The server is too busy to help you now.") {
						await waitFor(5000);
					}
					process.exit(1);
				}
			}
		);
}
