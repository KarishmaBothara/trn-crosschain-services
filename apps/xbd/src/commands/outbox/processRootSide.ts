import { createLogger } from "@subsquid/logger";
import {
	BatchContext,
	BatchProcessorItem,
	SubstrateBlock,
} from "@subsquid/substrate-processor";
import { EventItem } from "@subsquid/substrate-processor/lib/interfaces/dataSelection";

import {
	EthBridgeEventSendEvent,
	EthBridgeProofDelayedEvent,
	XrplBridgeWithdrawDelayedEvent,
	XrplBridgeWithdrawRequestEvent,
} from "@trncs/specs/generated/events";
import { EthySigningRequest_XrplTx } from "@trncs/specs/generated/v12";
import { createSubstrateProcessor } from "@trncs/utils/createSubstrateProcessor";
import { fetchFinalisedHead } from "@trncs/utils/fetchFinalisedHead";
import { archiveEndpoint } from "@trncs/xbd/config";
import { handleEventSendEvent } from "@trncs/xbd/mappings/outbox/handleEventSendEvent";
import { handleProofDelayedEvent } from "@trncs/xbd/mappings/outbox/handleProofDelayedEvent";
import { handleXrplWithdrawalDelayed } from "@trncs/xbd/mappings/outbox/handleXrplWithdrawalDelayed";
import { handleXrplWithdrawRequest } from "@trncs/xbd/mappings/outbox/handleXrplWithdrawRequest";
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
export const desc = `Process outgoing events from "EthBridge"`;

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
	.addEvent("EthBridge.EventSend", eventOptions)
	.addEvent("EthBridge.ProofDelayed", eventOptions)
	.addEvent("XRPLBridge.WithdrawDelayed", eventOptions)
	.addEvent("XRPLBridge.WithdrawRequest", eventOptions);

type Item = BatchProcessorItem<typeof processor>;
type Context = BatchContext<Store, Item>;

export type ExtContext = Context & {
	slack: typeof slack;
	index: number;
};

export type EventSendArgs = InstanceType<
	typeof EthBridgeEventSendEvent
>["asV12"] & { signingRequest: EthySigningRequest_XrplTx };
export type EventSendItem = EventItem<
	"EthBridge.EventSend",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type ProofDelayedArgsV4 = InstanceType<
	typeof EthBridgeProofDelayedEvent
>["asV6"];
export type ProofDelayedArgsV53 = InstanceType<
	typeof EthBridgeProofDelayedEvent
>["asV53"];
export type ProofDelayedItem = EventItem<
	"EthBridge.ProofDelayed",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type XrplBridgeWithdrawalDelayedArgs = InstanceType<
	typeof XrplBridgeWithdrawDelayedEvent
>["asV49"];
export type XrplBridgeWithdrawalDelayedItem = EventItem<
	"XRPLBridge.WithdrawDelayed",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type XrplBridgeWithdrawRequestArgs = InstanceType<
	typeof XrplBridgeWithdrawRequestEvent
>["asV12"];
export type XrplBridgeWithdrawRequestItem = EventItem<
	"XRPLBridge.WithdrawRequest",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export async function handler() {
	createLogger("trn").info(`channel: Outbox, network: Root`);
	const [rootApi, prismaClient] = await Promise.all([
		getRootApi(),
		getPrismaClient(),
	]);
	(processor as ReturnType<typeof createSubstrateProcessor>)
		.setInitialBlockHeight(await fetchFinalisedHead(rootApi))
		.run(
			createProxyDatabase(prismaClient, StatusCollection.ObxRootStatus, "XBD"),
			async (ctx: Context) => {
				const { blocks, _chain, log, store } = ctx;
				const extCtx = { ...ctx, slack } as ExtContext;
				try {
					for (const { items, header } of blocks) {
						for (const [index, item] of items.entries()) {
							switch (item.name) {
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
								case "EthBridge.ProofDelayed": {
									const args: ProofDelayedArgsV4 | ProofDelayedArgsV53 =
										_chain.decodeEvent(item.event);
									await handleProofDelayedEvent(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}
								case "XRPLBridge.WithdrawDelayed": {
									const args: XrplBridgeWithdrawalDelayedArgs =
										_chain.decodeEvent(item.event);
									await handleXrplWithdrawalDelayed(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}
								case "XRPLBridge.WithdrawRequest": {
									const args: XrplBridgeWithdrawRequestArgs =
										_chain.decodeEvent(item.event);
									await handleXrplWithdrawRequest(
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
