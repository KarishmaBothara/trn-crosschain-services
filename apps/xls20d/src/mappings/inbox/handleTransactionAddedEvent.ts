import {
	ExtContext,
	TransactionAddedArgs,
	TransactionAddedItem,
} from "@trncs/xls20d/commands/inbox/processRootSide";

export async function handleTransactionAddedEvent(
	ctx: ExtContext,
	item: TransactionAddedItem,
	args: TransactionAddedArgs
): Promise<void> {
	const { store } = ctx;
	const log = (ctx.log = ctx.log.child("TransactionAdded"));
	const xrplHash = args[1].toString();
	const data = {
		extrinsicId: item.event.extrinsic?.id,
	};

	log.info(`start with xrplHash #${xrplHash}`);
	const record = await store.txDeposit.findFirst({ where: { xrplHash } });
	if (!record) {
		log.warn(`TxDeposit record with xrplHash #${xrplHash} is not found`);
		log.info("skipped");
		return;
	}

	log.info(`update TxDeposit record with xrplHash #${xrplHash}`);

	await store.txDeposit.update({
			where: { xrplHash },
			data,
		});

	log.info(`done`);
}
