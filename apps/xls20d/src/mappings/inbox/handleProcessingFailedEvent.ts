import {
	ExtContext,
	ProcessingFailedArgs,
	ProcessingFailedItem,
} from "@trncs/xls20d/commands/inbox/processRootSide";
import { NFTStatus } from "@trncs/xls20d/prisma";

export async function handleProcessingFailedEvent(
	ctx: ExtContext,
	_item: ProcessingFailedItem,
	args: ProcessingFailedArgs
): Promise<void> {
	const { store } = ctx;
	const xrplHash = args[1].toString();
	const record = await store.txDeposit.findFirst({ where: { xrplHash } });
	const log = (ctx.log = ctx.log.child("ProcessingFailed"));
	const data = { status: NFTStatus.ProcessingFailed };

	log.info(`start with xrplHash #${xrplHash}`);
	if (!record) {
		log.warn(`TxDeposit record with xrplHash #${xrplHash} is not found`);
		return;
	}

	log.info(`update TxDeposit record with xrplHash #${xrplHash}`);
	await store.txDeposit.update({
			where: { xrplHash },
			data,
	});

	log.info(`done`);
}
