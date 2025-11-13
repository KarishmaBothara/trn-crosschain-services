import {
	ExtContext,
	ProcessingFailedArgsV54,
	ProcessingFailedItem,
} from "@trncs/ebd/commands/inbox/processRootSide";
import { TxStatus } from "@trncs/ebd/prisma";
import { getEthersProvider } from "@trncs/ebd/utils/getEthersProvider";

export async function handleProcessingFailedEvent(
	ctx: ExtContext,
	_item: ProcessingFailedItem,
	args: ProcessingFailedArgsV54
): Promise<void> {
	const { store, slack } = ctx;
	const messageId = Array.isArray(args)
		? Number(args[0])
		: Number(args.eventClaimId);
	const record = await store.txDeposit.findFirst({ where: { messageId } });
	const log = (ctx.log = ctx.log.child("ProcessingFailed"));

	log.info(`start with messageId #${messageId}`);

	if (!record) {
		log.warn(`TxDeposit record with messageId #${messageId} is not found`);
		log.info("skipped");
		return;
	}

	let from = record.from;
	if (from === "0x") {
		const ethHash = record.ethHash;
		const provider = getEthersProvider();
		const receipt = (await provider.getTransactionReceipt(ethHash)) ?? {
			from: "0x",
		};

		from = receipt.from;
		log.info({ from }, `Attempted to fetch the "from" field for "${ethHash}`);
		slack.info(
			`ProcessingFailed: Attempted to fetch the "from" field for "${ethHash}": ${from}`
		);
	}

	const data = { status: TxStatus.ProcessingFailed, from };

	log.info(`update TxDeposit record with messageId #${messageId}`);
	store.$push(
		store.txDeposit.update({
			where: { messageId },
			data,
		})
	);

	log.info(`done`);
}
