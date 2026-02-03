import { createLogger } from "@subsquid/logger";
import { BigNumber, Event } from "ethers";

import { blockDelay, bridgeContractAddress, ethNetwork } from "@trncs/ebd/config";
import { handleMessageReceivedEvent } from "@trncs/ebd/mappings/outbox/handleMessageReceivedEvent";
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
export const desc = `Process outgoing events from ${bridgeContractAddress}`;

const slack = createSlackLogger(LoggerChannel.Outgoing, LoggerChild.Ethereum);
const bridgeContract = getBridgeContract();
const processor = createEthereumProcessor<Store>()
	.setProvider(getEthersProvider())
	.setContract(bridgeContract)
	.setBlockDelay(blockDelay)
	.addEvent(bridgeContract.filters.MessageReceived());

export type ExtContext = Context<Store> & {
	slack: typeof slack;
	index: number;
};

export type MessageReceivedArgs = {
	eventId: number;
	source: string;
	destination: string;
	message: string;
};

export type MessageReceivedEvent = Event;

export async function handler() {
	createLogger("eth").info(
		`channel: Outbox, network: Ethereum, bridge: ${bridgeContractAddress}`
	);
	const serviceName = ethNetwork === "sepolia" ? 'EBD-TEST' : 'EBD';
	const prismaClient = await getPrismaClient();
	await processor.run(
		createProxyDatabase(prismaClient, StatusCollection.ObxEthStatus, serviceName),
		async (ctx) => {
			const { events, log, store } = ctx;
			try {
				for (const [index, event] of events.entries()) {
					const [eventId, source, destination, message] = event.args as [
						BigNumber,
						string,
						string,
						string
					];

					await handleMessageReceivedEvent({ ...ctx, slack, index }, event, {
						source,
						destination,
						message,
						eventId: eventId.toNumber(),
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
