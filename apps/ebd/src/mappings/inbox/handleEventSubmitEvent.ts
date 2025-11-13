import {
	EventSubmitArgsV54,
	EventSubmitItem,
	ExtContext,
} from "@trncs/ebd/commands/inbox/processRootSide";
import { getEthersProvider } from "@trncs/ebd/utils/getEthersProvider";

export async function handleEventSubmitEvent(
	ctx: ExtContext,
	item: EventSubmitItem,
	args: EventSubmitArgsV54
): Promise<void> {
	const { store, slack } = ctx;
	const log = (ctx.log = ctx.log.child("EventSubmit"));
	const messageId =
		"eventClaimId" in args
			? Number((args as EventSubmitArgsV54).eventClaimId)
			: Number(args[0]);
	log.info(`start with messageId #${messageId}`);

	const record = await store.txDeposit.findFirst({ where: { messageId } });
	if (!record) {
		log.warn(`TxDeposit record with messageId #${messageId} not found`);
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
		log.info({ from }, `Attempted to fetch the "from" field for "${ethHash}"`);
		slack.info(
			`EventSubmit: Attempted to fetch the "from" field for "${ethHash}": ${from}`
		);
	}

	const data = {
		extrinsicId: item.event.extrinsic?.id,
		from,
	};

	log.info(`update TxDeposit with messageId #${messageId}`);
	store.$push(
		store.txDeposit.update({
			where: { messageId },
			data,
		})
	);

	log.info(`done`);
}
