import {
	ExtContext,
	ProcessingFailedArgs,
	ProcessingFailedItem,
} from "@trncs/xbd/commands/inbox/processRootSide";
import { TxStatus } from "@trncs/xbd/prisma";

export async function handleProcessingFailedEvent(
	ctx: ExtContext,
	_item: ProcessingFailedItem,
	args: ProcessingFailedArgs
): Promise<void> {
	const { store } = ctx;
	const xrplHash = args[1].toString();
	const record = await store.txDeposit.findFirst({ where: { xrplHash } });
	const log = (ctx.log = ctx.log.child("ProcessingFailed"));
	const data = { status: TxStatus.ProcessingFailed };

	log.info(`start with xrplHash #${xrplHash}`);
	if (!record) {
		log.warn(`TxDeposit record with xrplHash #${xrplHash} is not found`);
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
