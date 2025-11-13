import { createLogger } from "@subsquid/logger";
import {
	BatchContext,
	BatchProcessorItem,
	SubstrateBlock,
} from "@subsquid/substrate-processor";
import { EventItem } from "@subsquid/substrate-processor/lib/interfaces/dataSelection";

import {
	XrplBridgeProcessedEvent,
	XrplBridgeProcessingFailedEvent,
	XrplBridgeProcessingOkEvent,
	XrplBridgeTransactionAddedEvent,
} from "@trncs/specs/generated/events";
import { createSubstrateProcessor } from "@trncs/utils/createSubstrateProcessor";
import { fetchFinalisedHead } from "@trncs/utils/fetchFinalisedHead";
import { archiveEndpoint } from "@trncs/xbd/config";
import { handleProcessingFailedEvent } from "@trncs/xbd/mappings/inbox/handleProcessingFailedEvent";
import { handleProcessingOkEvent } from "@trncs/xbd/mappings/inbox/handleProcessingOkEvent";
import { handleTransactionAddedEvent } from "@trncs/xbd/mappings/inbox/handleTransactionAddedEvent";
import { StatusCollection } from "@trncs/xbd/types";
import {
	createProxyDatabase,
	Store,
} from "@trncs/xbd/utils/createProxyDatabase";
import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/xbd/utils/createSlackLogger";
import { getPrismaClient } from "@trncs/xbd/utils/getPrismaClient";
import { getRootApi } from "@trncs/xbd/utils/getRootApi";

export const command = "processRootSide";
export const desc = `Process incoming events from "EthBridge"`;

const eventOptions = {
	data: {
		event: {
			args: true,
			extrinsic: true,
		},
	},
} as const;

const slack = createSlackLogger(LoggerChannel.Incoming, LoggerChild.Root);
const processor = createSubstrateProcessor(archiveEndpoint)
	.addEvent("XRPLBridge.Processed", eventOptions)
	.addEvent("XRPLBridge.ProcessingOk", eventOptions)
	.addEvent("XRPLBridge.ProcessingFailed", eventOptions)
	.addEvent("XRPLBridge.TransactionAdded", eventOptions);

type Item = BatchProcessorItem<typeof processor>;
type Context = BatchContext<Store, Item>;

export type ExtContext = Context & {
	slack: typeof slack;
	index: number;
};

export type TransactionAddedArgs = InstanceType<
	typeof XrplBridgeTransactionAddedEvent
>["asV4"];
export type TransactionAddedItem = EventItem<
	"XRPLBridge.TransactionAdded",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type ProcessedArgs = InstanceType<
	typeof XrplBridgeProcessedEvent
>["asV4"];
export type ProcessedItem = EventItem<
	"XRPLBridge.Processed",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type ProcessingOkArgs = InstanceType<
	typeof XrplBridgeProcessingOkEvent
>["asV26"];
export type ProcessingOkItem = EventItem<
	"XRPLBridge.ProcessingOk",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type ProcessingFailedArgs = InstanceType<
	typeof XrplBridgeProcessingFailedEvent
>["asV26"];
export type ProcessingFailedItem = EventItem<
	"XRPLBridge.ProcessingFailed",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export async function handler() {
	createLogger("trn").info(`channel: Inbox, network: Root`);
	const [rootApi, prismaClient] = await Promise.all([
		getRootApi(),
		getPrismaClient(),
	]);
	(processor as ReturnType<typeof createSubstrateProcessor>)
		.setInitialBlockHeight(await fetchFinalisedHead(rootApi))
		.run(
			createProxyDatabase(prismaClient, StatusCollection.IbxRootStatus, "XBD"),
			async (ctx: Context) => {
				const { blocks, log, _chain, store } = ctx;
				const extCtx = { ...ctx, slack } as ExtContext;
				try {
					for (const { items, header } of blocks) {
						for (const [index, item] of items.entries()) {
							switch (item.name) {
								case "XRPLBridge.TransactionAdded": {
									const args: TransactionAddedArgs = _chain.decodeEvent(
										item.event
									);
									await handleTransactionAddedEvent(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}

								case "XRPLBridge.Processed":
								case "XRPLBridge.ProcessingOk": {
									const args: ProcessingOkArgs = _chain.decodeEvent(item.event);
									await handleProcessingOkEvent(
										{ ...extCtx, index },
										{ ...item, header } as unknown as ProcessingOkItem,
										args
									);
									break;
								}

								case "XRPLBridge.ProcessingFailed": {
									const args: ProcessingFailedArgs = _chain.decodeEvent(
										item.event
									);
									await handleProcessingFailedEvent(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}
							}

							await store.$commit(header.height, slack);
						}
					}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} catch (error: any) {
					log.fatal(error?.message ?? error);
					slack.fatal(error?.message ?? error);
					prismaClient.$disconnect();
					process.exit(1);
				}
			}
		);
}
