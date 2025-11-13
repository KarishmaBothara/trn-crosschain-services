import { TransactionMetadata } from "xrpl";

import { ExtContext } from "@trncs/xbd/commands/outbox/processXrplSide";
import { TxStatus } from "@trncs/xbd/prisma";
import { SignerListSetTx } from "@trncs/xbd/types";

export async function handleSignerListSetTx(
	ctx: ExtContext,
	txn: { tx: SignerListSetTx; meta: TransactionMetadata }
): Promise<void> {
	const { store } = ctx;
	const { tx, meta } = txn;
	const xrplHash = tx.hash!;
	const log = (ctx.log = ctx.log.child("SignerListSetTx"));

	log.info(`start with xrplHash #${xrplHash}`);
	const record = await store.txSignerSetChange.findFirst({
		where: { xrplHash },
	});

	if (!record) {
		log.warn(
			`TxSignerSetChange record with xrplHash #${xrplHash} is not found`
		);
		log.info("skipped");
		return;
	}

	log.info(`update TxSignerSetChange record with xrplHash #${xrplHash}`);
	store.$push(
		store.txSignerSetChange.update({
			where: { eventId: record.eventId },
			data: {
				status:
					(meta as TransactionMetadata).TransactionResult === "tesSUCCESS"
						? TxStatus.ProcessingOk
						: TxStatus.ProcessingFailed,
				updatedAt: new Date(),
			},
		})
	);

	log.info(`done`);
}
