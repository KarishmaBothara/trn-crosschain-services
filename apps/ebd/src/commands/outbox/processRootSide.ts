import { createLogger } from "@subsquid/logger";
import {
	BatchContext,
	BatchProcessorItem,
	SubstrateBlock,
} from "@subsquid/substrate-processor";
import { EventItem } from "@subsquid/substrate-processor/lib/interfaces/dataSelection";

import { archiveEndpoint } from "@trncs/ebd/config";
import { handleErc20WithdrawalDelayed } from "@trncs/ebd/mappings/outbox/handleErc20WithdrawalDelayed";
import { handleErc721WithdrawEvent } from "@trncs/ebd/mappings/outbox/handleErc721WithdrawEvent";
import { handleEventSendEvent } from "@trncs/ebd/mappings/outbox/handleEventSendEvent";
import { handleProofDelayedEvent } from "@trncs/ebd/mappings/outbox/handleProofDelayedEvent";
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
	Erc20PegErc20WithdrawalDelayedEvent,
	// Erc20PegErc20WithdrawEvent,
	EthBridgeEventSendEvent,
	EthBridgeProofDelayedEvent,
	NftPegErc721WithdrawEvent,
} from "@trncs/specs/generated/events";
import { EthySigningRequest_Ethereum } from "@trncs/specs/generated/v54";
import { createSubstrateProcessor } from "@trncs/utils/createSubstrateProcessor";
import { fetchFinalisedHead } from "@trncs/utils/fetchFinalisedHead";

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
	.addEvent("Erc20Peg.Erc20WithdrawalDelayed", eventOptions)
	.addEvent("NftPeg.Erc721Withdraw", eventOptions);
	// .addEvent("Erc20Peg.Erc20Withdraw", eventOptions);

type Item = BatchProcessorItem<typeof processor>;
type Context = BatchContext<Store, Item>;

export type ExtContext = Context & {
	slack: typeof slack;
	index: number;
};

export type EventSendArgs = InstanceType<
	typeof EthBridgeEventSendEvent
>["asV54"] & { signingRequest: EthySigningRequest_Ethereum };
export type EventSendItem = EventItem<
	"EthBridge.EventSend",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type ProofDelayedArgsV54 = InstanceType<
	typeof EthBridgeProofDelayedEvent
>["asV54"];

export type ProofDelayedItem = EventItem<
	"EthBridge.ProofDelayed",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type Erc721WithdrawArgs = InstanceType<
	typeof NftPegErc721WithdrawEvent
>["asV54"];
export type Erc721WithdrawItem = EventItem<
	"NftPeg.Erc721Withdraw",
	typeof eventOptions["data"]
> & { header: SubstrateBlock };

export type Erc20WithdrawalDelayedArgsV54 = InstanceType<
	typeof Erc20PegErc20WithdrawalDelayedEvent
>["asV54"];
export type Erc20WithdrawalDelayedItem = EventItem<
	"Erc20Peg.Erc20WithdrawalDelayed",
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
			createProxyDatabase(prismaClient, StatusCollection.ObxRootStatus, "EBD"),
			async (ctx: Context) => {
				const { blocks, _chain, log, store } = ctx;
				const extCtx = { ...ctx, slack } as ExtContext;
				try {
					for (const { items, header } of blocks) {
						for (const [index, item] of items.entries()) {
							switch (item.name) {
								case "EthBridge.EventSend": {
									const args: EventSendArgs = _chain.decodeEvent(item.event);
									if (args?.signingRequest?.__kind !== "Ethereum") break;
									await handleEventSendEvent(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}
								case "EthBridge.ProofDelayed": {
									const args: ProofDelayedArgsV54 = _chain.decodeEvent(
										item.event
									);
									await handleProofDelayedEvent(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}
								case "Erc20Peg.Erc20WithdrawalDelayed": {
									const args: Erc20WithdrawalDelayedArgsV54 =
										_chain.decodeEvent(item.event);
									await handleErc20WithdrawalDelayed(
										{ ...extCtx, index },
										{ ...item, header },
										args
									);
									break;
								}

								case "NftPeg.Erc721Withdraw": {
									const args: Erc721WithdrawArgs = _chain.decodeEvent(
										item.event
									);
									await handleErc721WithdrawEvent(
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
