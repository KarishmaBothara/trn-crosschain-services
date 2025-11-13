import {
	ExtContext,
	SendMessageArgs,
	SendMessageEvent,
} from "@trncs/ebd/commands/inbox/processEthSide";
import {
	devCallers,
	inboxRelayerSeed,
	pegPalletAddress,
} from "@trncs/ebd/config";
import { Prisma, TxDeposit, TxStatus } from "@trncs/ebd/prisma";
import { decodeMessage } from "@trncs/ebd/utils/decodeMessage";
import { getRootApi } from "@trncs/ebd/utils/getRootApi";
import { getSourceContractAddresses } from "@trncs/ebd/utils/getSourceContractAddresses";
import { checkRootXRPBalance } from "@trncs/utils/checkRootXRPBalance";
import { minXRPInWallet } from "@trncs/utils/config";
import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import { createRelayerKeyring } from "@trncs/utils/createRelayerKeyring";
import { isStringInArray } from "@trncs/utils/isStringInArray";
import { submitExtrinsic } from "@trncs/utils/submitExtrinsic";

const signer = createRelayerKeyring(inboxRelayerSeed);
export async function handleSendMessageEvent(
	ctx: ExtContext,
	event: SendMessageEvent,
	args: SendMessageArgs
): Promise<void> {
	const log = (ctx.log = ctx.log.child("SendMessage"));
	let output: string | void = undefined;

	log.info(`start with ethHash #${event.transactionHash}`);

	switch (args.destination.toLowerCase()) {
		case pegPalletAddress.erc20.toLowerCase():
		case pegPalletAddress.erc721.toLowerCase(): {
			output = await handleDeposit(ctx, event, args);
			break;
		}
	}

	if (output) log.info(output);
}

const SKIPPABLE_ERRORS = {
	ETH: ["value out of range"],
	ROOT: [
		"ethBridge.EventReplayProcessed",
		"ethBridge.EventReplayPending",
		"Priority is too low",
	],
};
function isSkippableError(phrases: string[], error: Error) {
	return phrases.some((phrase) =>
		error.message ? error.message.indexOf(phrase) >= 0 : false
	);
}

async function handleDeposit(
	ctx: ExtContext,
	event: SendMessageEvent,
	args: SendMessageArgs
): Promise<"done" | "skipped"> {
	const { store, log, slack } = ctx;
	const rootApi = await getRootApi();
	const validSourceAddresses = await getSourceContractAddresses(rootApi);
	const ethHash = event.transactionHash;

	try {
		const { from } = (await event.getTransactionReceipt()) ?? { from: "0x" };
		const { messageId, messageFee, destination, message, source } = args;

		if (isStringInArray(from, devCallers)) {
			log.warn(
				`Ignore transaction with ethHash #${ethHash} since it was sent from a DEV account "${from}"`
			);
			return "skipped";
		}

		if (!isStringInArray(source, validSourceAddresses)) {
			slack.warn(
				`Ignore transaction with source #${source} as it is invalid source, ethHash #${ethHash}, message #${message}`
			);
			return "skipped";
		}

		if (from === "0x") {
			slack.warn(`Fetching "from" field failed for "${ethHash}"`);
		}
		log.info(`upsert TxDeposit record with ethhash #${ethHash}`);

		store.$push(
			store.txDeposit.upsert(
				createModelUpsertArgs<TxDeposit, Prisma.TxDepositUpsertArgs>(
					{ ethHash },
					{
						messageData: event.data,
						messageId,
						messageFee,
						from,
						ethHash,
						status: TxStatus.Processing,
						...decodeMessage(destination, message, "inbox"),
					}
				)
			)
		);
		log.info(`submit transaction with ethHash #${ethHash} to Root`);
		const tx = rootApi.tx.ethBridge.submitEvent(ethHash, event.data);
		await submitExtrinsic(tx, signer, { log }).catch((error) => {
			if (!isSkippableError(SKIPPABLE_ERRORS.ROOT, error)) throw error;
			log.warn(
				`Ignore transaction with ethHash #${ethHash} since error with message "${error.message}" is skippable`
			);
		});
		const [sufficient, currentAmount] = await checkRootXRPBalance(
			rootApi,
			signer.address
		);
		if (!sufficient) {
			slack.warn(
				`Relayer account \`${signer.address}\` XRP balance on TRN is lower than \`${minXRPInWallet} XRP\`, current balance is \`${currentAmount} XRP\`.`
			);
		}

		return "done";
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (error: any) {
		if (!isSkippableError(SKIPPABLE_ERRORS.ETH, error)) throw error;

		log.warn(
			`Ignore transaction with ethHash #${ethHash} since error with message "${error.message}" is skippable`
		);
		slack.warn(
			`Ignore transaction with ethHash #${ethHash} since error with message "${error.message}" is skippable`
		);
		return "skipped";
	}
}
