import {
	ExtContext,
	ProcessingOkArgs,
	ProcessingOkItem,
} from "@trncs/xbd/commands/inbox/processRootSide";
import { TxStatus } from "@trncs/xbd/prisma";

export async function handleProcessingOkEvent(
	ctx: ExtContext,
	_item: ProcessingOkItem,
	args: ProcessingOkArgs
): Promise<void> {
	const { store } = ctx;
	const xrplHash = args[1].toString();
	const log = (ctx.log = ctx.log.child("ProcessingOk"));
	const data = { status: TxStatus.ProcessingOk };

	log.info(`start with xrplHash #${xrplHash}`);
	const record = await store.txDeposit.findFirst({ where: { xrplHash } });
	if (!record) {
		log.warn(`TxDeposit record with xrplHash #${xrplHash} is not found`);
		log.info("skipped");
		return;
	}

	log.info(`update TxDeposit record with xrplHash #${xrplHash}`);
	store.$push(
		store.txDeposit.update({
			where: { xrplHash },
			data,
		})
	);

	log.info(`done`);
}
