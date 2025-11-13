import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import {
	ExtContext,
	ProofDelayedArgsV4,
	ProofDelayedArgsV53,
	ProofDelayedItem,
} from "@trncs/xbd/commands/outbox/processRootSide";
import { Prisma, TxStatus, TxWithdrawal } from "@trncs/xbd/prisma";

export async function handleProofDelayedEvent(
	ctx: ExtContext,
	item: ProofDelayedItem,
	args: ProofDelayedArgsV4 | ProofDelayedArgsV53
): Promise<void> {
	const { store, slack } = ctx;
	const eventId =
		typeof args === "bigint"
			? Number(args)
			: Number((args as ProofDelayedArgsV53).eventProofId);
	const log = ctx.log.child("ProofDelayed");

	log.info(`start with eventId #${eventId}`);

	if (!item.event.extrinsic) {
		log.info(`Skipping proof delayed event with eventId #${eventId}`);
		slack.warn(
			`Skipping proof delayed event with eventId #${eventId} as extrinsic is not found`
		);
		return;
	}
	const extrinsicId = item.event.extrinsic!.id;
	const from = item.event.extrinsic!.signature?.address;

	log.info(`upsert TxWithdrawal record with eventId #${eventId}`);
	store.$push(
		store.txWithdrawal.upsert(
			createModelUpsertArgs<TxWithdrawal, Prisma.TxWithdrawalUpsertArgs>(
				{ extrinsicId },
				{
					from,
					eventId,
					extrinsicId,
					status: TxStatus.Delayed,
				}
			)
		)
	);

	log.info("done");
}
