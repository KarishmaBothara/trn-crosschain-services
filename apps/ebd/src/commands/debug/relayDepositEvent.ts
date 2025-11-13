import { createLogger } from "@subsquid/logger";
import assert from "assert";
import { utils } from "ethers";
import { Argv } from "yargs";

import { inboxRelayerSeed, pegPalletAddress } from "@trncs/ebd/config";
import { Prisma, TxDeposit, TxStatus } from "@trncs/ebd/prisma";
import { decodeMessage } from "@trncs/ebd/utils/decodeMessage";
import { getEthersProvider } from "@trncs/ebd/utils/getEthersProvider";
import { getPrismaClient } from "@trncs/ebd/utils/getPrismaClient";
import { getRootApi } from "@trncs/ebd/utils/getRootApi";
import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import { createRelayerKeyring } from "@trncs/utils/createRelayerKeyring";
import { submitExtrinsic } from "@trncs/utils/submitExtrinsic";

export const command = "relayDepositEvent";
export const desc = "Relay an event from Ethereum to TRN";

const log = createLogger("debug");

export async function builder(instance: Argv) {
	return instance.option("messageId", {
		alias: "mId",
		demandOption: true,
		type: "number",
	});
}

export async function handler(argv: { messageId: number }) {
	const { messageId } = argv;
	const prisma = await getPrismaClient();
	const localLog = log.child(`#${messageId}`);
	const txRecord: TxDeposit | null = await prisma.txDeposit.findFirst({
		where: { messageId },
	});
	if (!txRecord) {
		return localLog.warn(
			`${txRecord} record with messageId #${messageId} not found`
		);
	}
	const txHash = txRecord.ethHash;
	const { messageFee, messageData } = txRecord;
	assert(messageFee !== null, "Message fee is not correct");

	const [, arg2, arg3, arg4] = utils.defaultAbiCoder.decode(
		["uint256", "address", "address", "bytes", "uint256"],
		messageData
	);

	const source = arg2;
	const destination = arg3;
	const message = arg4;

	const provider = getEthersProvider();
	const receipt = await provider.getTransactionReceipt(txHash);

	const from = receipt.from;
	await handleDepositEvent({
		messageId,
		message,
		messageFee: parseInt(messageFee),
		source,
		destination,
		txHash,
		from,
		messageData,
	});
	process.exit(0);
}

export type depositArgs = {
	messageId: number;
	messageFee: number;
	source: string;
	destination: string;
	message: string;
	txHash: string;
	from: string;
	messageData: string;
};
export async function handleDepositEvent(args: depositArgs): Promise<void> {
	const ethHash = args.txHash;

	log.info(`start with ethHash #${ethHash}`);

	let output: string | void = undefined;
	switch (args.destination.toLowerCase()) {
		case pegPalletAddress.erc20.toLowerCase():
		case pegPalletAddress.erc721.toLowerCase(): {
			output = await handleDeposit(args);
			break;
		}
	}

	if (output) log.info(output);
}
const SKIPPABLE_ERRORS = [
	"ethBridge.EventReplayProcessed",
	"ethBridge.EventReplayPending",
	"Priority is too low",
];

async function handleDeposit(args: depositArgs): Promise<"done" | "skipped"> {
	const rootApi = await getRootApi();
	const ethHash = args.txHash;
	const {
		messageId,
		messageFee,
		destination,
		message,
		from,
		txHash,
		messageData,
	} = args;
	const prisma = await getPrismaClient();

	log.info(`upsert TxDeposit record with ethhash #${ethHash}`);

	prisma.txDeposit.upsert(
		createModelUpsertArgs<TxDeposit, Prisma.TxDepositUpsertArgs>(
			{ ethHash: txHash },
			{
				messageData: messageData,
				messageId,
				messageFee: messageFee.toString(),
				from,
				ethHash: txHash,
				status: TxStatus.Processing,
				...decodeMessage(destination, message, "inbox"),
			}
		)
	);
	log.info(`submit transaction with ethHash #${ethHash} to Root`);
	const tx = rootApi.tx.ethBridge.submitMissingEvent(ethHash, messageData);
	const signer = createRelayerKeyring(inboxRelayerSeed);
	await submitExtrinsic(tx, signer, { log }).catch((error) => {
		const matched = SKIPPABLE_ERRORS.some((phrase) =>
			error.message ? error.message.indexOf(phrase) >= 0 : false
		);
		if (!matched) throw error;
		log.warn(
			`Ignore transaction with ethHash #${ethHash} since error with message "${error.message}" is skippable`
		);
	});

	log.info(`submitted transaction with ethHash #${ethHash} to Root`);

	return "done";
}
