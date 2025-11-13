import { u8aToHex } from "@polkadot/util";
import {
	BatchContext,
	BatchProcessorItem,
} from "@subsquid/substrate-processor";
import { decode, Transaction } from "xrpl";

import { XrplBridgeTicketSequenceThresholdReachedEvent } from "@trncs/specs/generated/events";
import { createSubstrateProcessor } from "@trncs/utils/createSubstrateProcessor";
import { fetchFinalisedHead } from "@trncs/utils/fetchFinalisedHead";
import { EventSendArgs } from "@trncs/xbd/commands/outbox/processRootSide";
import { archiveEndpoint, xrplDoorAccount } from "@trncs/xbd/config";
import { handleThresholdReachedEvent } from "@trncs/xbd/mappings/ticket/handleThresholdReachedEvent";
import { StatusCollection } from "@trncs/xbd/types";
import {
	createMongoDatabase,
	Store,
} from "@trncs/xbd/utils/createMongoDatabase";
import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/xbd/utils/createSlackLogger";
import { getPrismaClient } from "@trncs/xbd/utils/getPrismaClient";
import { getRootApi } from "@trncs/xbd/utils/getRootApi";

export const command = "processRootSide";
export const desc = `Process ticket events from "XRPLBridge"`;

const eventOptions = {
	data: {
		event: {
			args: true,
		},
	},
} as const;
const slack = createSlackLogger(LoggerChannel.Ticket, LoggerChild.Root);
const processor = createSubstrateProcessor(archiveEndpoint)
	.addEvent("XRPLBridge.TicketSequenceThresholdReached", eventOptions)
	.addEvent("EthBridge.EventSend", eventOptions);

type Item = BatchProcessorItem<typeof processor>;
type Context = BatchContext<Store, Item>;

export type ThresholdReachedArgs = InstanceType<
	typeof XrplBridgeTicketSequenceThresholdReachedEvent
>["asV62"];

export type ExtContext = Context & {
	slack: typeof slack;
	index: number;
};

export async function handler() {
	const [rootApi, prismaClient] = await Promise.all([
		getRootApi(),
		getPrismaClient(),
	]);

	console.info(`
Channel: Ticket
Network: Root
`);
	(processor as ReturnType<typeof createSubstrateProcessor>)
		.setInitialBlockHeight(await fetchFinalisedHead(rootApi))
		.run(
			createMongoDatabase(prismaClient, StatusCollection.TckRootStatus, "XBD"),
			async (ctx: Context) => {
				const { blocks, _chain, log } = ctx;
				const extCtx = { ...ctx, slack } as ExtContext;
				try {
					for (const { items } of blocks) {
						const preservedMainDoorTickets: number[] = [];
						const preservedNFTDoorTickets: number[] = [];
						let thresholdInfo: {
							index: number;
							item: ThresholdReachedArgs;
						} | null = null;
						for (const [index, item] of items.entries()) {
							switch (item.name) {
								case "EthBridge.EventSend": {
									const args: EventSendArgs = _chain.decodeEvent(item.event);
									if (args.signingRequest.__kind !== "XrplTx") break;
									const { signingRequest } = args;

									const txBlob = u8aToHex(signingRequest.value);
									const tx = decode(
										txBlob.substring(2)
									) as unknown as Transaction;
									if (tx.TicketSequence) {
										if (tx.Account === xrplDoorAccount) {
											preservedMainDoorTickets.push(tx.TicketSequence);
										} else {
											preservedNFTDoorTickets.push(tx.TicketSequence);
										}
									}
									break;
								}

								case "XRPLBridge.TicketSequenceThresholdReached": {
									const args: ThresholdReachedArgs = _chain.decodeEvent(
										item.event
									);
									thresholdInfo = {
										index: index,
										item: args as ThresholdReachedArgs,
									};
									break;
								}
							}
						}

						if (thresholdInfo) {
							const { index, item } = thresholdInfo;
							await handleThresholdReachedEvent(
								{ ...extCtx, index },
								item,
								preservedMainDoorTickets,
								preservedNFTDoorTickets
							);
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
