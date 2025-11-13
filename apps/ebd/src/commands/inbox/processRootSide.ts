import { createLogger } from "@subsquid/logger";
import {
	BatchContext,
	BatchProcessorItem,
	SubstrateBlock,
} from "@subsquid/substrate-processor";
import { EventItem } from "@subsquid/substrate-processor/lib/interfaces/dataSelection";

import { archiveEndpoint } from "@trncs/ebd/config";
import { handleErc20DepositDelayed } from "@trncs/ebd/mappings/inbox/handleErc20DepositDelayed";
import { handleEventSubmitEvent } from "@trncs/ebd/mappings/inbox/handleEventSubmitEvent";
import { handleProcessingFailedEvent } from "@trncs/ebd/mappings/inbox/handleProcessingFailedEvent";
import { handleProcessingOkEvent } from "@trncs/ebd/mappings/inbox/handleProcessingOkEvent";
import { StatusCollection } from "@trncs/ebd/types";
import {
	createProxyDatabase,
	Store,
} from "@trncs/ebd/utils/createProxyDatabase";
import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/ebd/utils/createSlackLogger";
import { getPrismaClient } from "@trncs/ebd/utils/getPrismaClient";
import { getRootApi } from "@trncs/ebd/utils/getRootApi";
import {
	Erc20PegErc20DepositDelayedEvent,
	EthBridgeEventSubmitEvent,
	EthBridgeProcessingFailedEvent,
	EthBridgeProcessingOkEvent,
} from "@trncs/specs/generated/events";
import { createSubstrateProcessor } from "@trncs/utils/createSubstrateProcessor";
import { fetchFinalisedHead } from "@trncs/utils/fetchFinalisedHead";

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
	.addEvent("Erc20Peg.Erc20DepositDelayed", eventOptions)
	.addEvent("EthBridge.EventSubmit", eventOptions)
	.addEvent("EthBridge.ProcessingOk", eventOptions)
	.addEvent("EthBridge.ProcessingFailed", eventOptions);

type Item = BatchProcessorItem<typeof processor>;
type Context = BatchContext<Store, Item>;

export type ExtContext = Context & {
	slack: typeof slack;
	index: number;
};

export type EventSubmitArgsV54 = InstanceType<
	typeof EthBridgeEventSubmitEvent
>["asV54"];

export type EventSubmitItem = EventItem<
	"EthBridge.EventSubmit",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type ProcessingOkArgsV54 = InstanceType<
	typeof EthBridgeProcessingOkEvent
>["asV54"];

export type ProcessingOkItem = EventItem<
	"EthBridge.ProcessingOk",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type ProcessingFailedArgsV54 = InstanceType<
	typeof EthBridgeProcessingFailedEvent
>["asV54"];

export type Erc20DepositDelayedArgsV54 = InstanceType<
	typeof Erc20PegErc20DepositDelayedEvent
>["asV54"];

export type ProcessingFailedItem = EventItem<
	"EthBridge.ProcessingFailed",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type Erc20DepositDelayedItem = EventItem<
	"Erc20Peg.Erc20DepositDelayed",
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
			createProxyDatabase(prismaClient, StatusCollection.IbxRootStatus, "EBD"),
			async (ctx: Context) => {
				const { blocks, _chain, log, store } = ctx;
				const extCtx = { ...ctx, slack } as ExtContext;

				try {
					for (const { items, header } of blocks) {
						for (const [index, item] of items.entries()) {
							switch (item.name) {
								case "EthBridge.EventSubmit": {
									const args: EventSubmitArgsV54 = _chain.decodeEvent(
										item.event
									);
									await handleEventSubmitEvent(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}

								case "EthBridge.ProcessingOk": {
									const args: ProcessingOkArgsV54 = _chain.decodeEvent(
										item.event
									);
									await handleProcessingOkEvent(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}

								case "EthBridge.ProcessingFailed": {
									const args: ProcessingFailedArgsV54 = _chain.decodeEvent(
										item.event
									);
									await handleProcessingFailedEvent(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}

								case "Erc20Peg.Erc20DepositDelayed": {
									const args: Erc20DepositDelayedArgsV54 = _chain.decodeEvent(
										item.event
									);
									await handleErc20DepositDelayed(
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
					await prismaClient.$disconnect();
					process.exit(1);
				}
			}
		);
}
