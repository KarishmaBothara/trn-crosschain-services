import { createLogger } from "@subsquid/logger";
import { BigNumber, Event } from "ethers";

import { blockDelay, bridgeContractAddress } from "@trncs/ebd/config";
import { handleSendMessageEvent } from "@trncs/ebd/mappings/inbox/handleSendMessageEvent";
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
import { getBridgeContract } from "@trncs/ebd/utils/getBridgeContract";
import { getEthersProvider } from "@trncs/ebd/utils/getEthersProvider";
import { getPrismaClient } from "@trncs/ebd/utils/getPrismaClient";
import {
	Context,
	createEthereumProcessor,
} from "@trncs/utils/createEthereumProcessor";

export const command = "processEthSide";
export const desc = `Process incoming events from "${bridgeContractAddress}"`;

const slack = createSlackLogger(LoggerChannel.Incoming, LoggerChild.Ethereum);
const bridgeContract = getBridgeContract();
const processor = createEthereumProcessor<Store>()
	.setProvider(getEthersProvider())
	.setContract(bridgeContract)
	.setBlockDelay(blockDelay)
	.addEvent(bridgeContract.filters.SendMessage());

export type ExtContext = Context<Store> & {
	slack: typeof slack;
	index: number;
};

export interface SendMessageArgs {
	messageId: number;
	messageFee: string;
	message: string;
	source: string;
	destination: string;
}

export type SendMessageEvent = Event;

export async function handler() {
	createLogger("eth").info(
		`channel: Inbox, network: Ethereum, bridge: ${bridgeContractAddress}`
	);

	const prismaClient = await getPrismaClient();

	await processor.run(
		createProxyDatabase(prismaClient, StatusCollection.IbxEthStatus, "EBD"),
		async (ctx) => {
			const { events, log, store } = ctx;
			try {
				for (const [index, event] of events.entries()) {
					const [messageId, source, destination, message, messageFee] =
						event.args as [BigNumber, string, string, string, BigNumber];

					await handleSendMessageEvent({ ...ctx, slack, index }, event, {
						messageId: messageId.toNumber(),
						messageFee: messageFee.toString(),
						message,
						source,
						destination,
					});
					const blockNumber = event.blockNumber;
					await store.$commit(blockNumber, slack);
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
