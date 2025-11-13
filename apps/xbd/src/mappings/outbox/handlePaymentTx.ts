import { TransactionMetadata } from "xrpl";

import { ExtContext } from "@trncs/xbd/commands/outbox/processXrplSide";
import { TxStatus } from "@trncs/xbd/prisma";
import { PaymentTx } from "@trncs/xbd/types";

export async function handlePaymentTx(
	ctx: ExtContext,
	txn: { tx: PaymentTx; meta: TransactionMetadata }
): Promise<void> {
	const { store } = ctx;
	const { tx, meta } = txn;
	const xrplHash = tx.hash!;
	const log = (ctx.log = ctx.log.child("PaymentTx"));

	log.info(`start with xrplHash #${xrplHash}`);

	const record = await store.txWithdrawal.findFirst({
		where: { xrplHash },
	});

	if (!record) {
		log.warn(`TxWithdrawal record with xrplHash #${xrplHash} is not found`);
		log.info("skipped");
		return;
	}

	log.info(`update TxWithdrawal record with xrplHash #${xrplHash}`);
	store.$push(
		store.txWithdrawal.update({
			where: { extrinsicId: record.extrinsicId },
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
