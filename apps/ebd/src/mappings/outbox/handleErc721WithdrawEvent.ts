import { u8aToHex } from "@polkadot/util";

import {
	Erc721WithdrawArgs,
	Erc721WithdrawItem,
	ExtContext,
} from "@trncs/ebd/commands/outbox/processRootSide";

export async function handleErc721WithdrawEvent(
	ctx: ExtContext,
	item: Erc721WithdrawItem,
	args: Erc721WithdrawArgs
): Promise<void> {
	const { store } = ctx;
	const log = (ctx.log = ctx.log.child("Erc721Withdraw"));

	const extrinsicId = item.event.extrinsic?.id;
	const data = { from: u8aToHex(args.origin) };

	if (!extrinsicId) {
		log.warn(`extrinsicId is null`);
		log.info(`skipped`);
		return;
	}

	log.info(`update TxWithdrawal record with extrinsicId #${extrinsicId}`);
	const withdrawal = await store.txWithdrawal.findUnique({
		where: { extrinsicId },
	});
	if (!withdrawal) {
		log.warn(`TxWithdrawal record with extrinsicId #${extrinsicId} not found`);
		log.info("skipped");
		return;
	}
	store.$push(
		store.txWithdrawal.update({
			where: { extrinsicId },
			data,
		})
	);
	log.info(`done`);
}
