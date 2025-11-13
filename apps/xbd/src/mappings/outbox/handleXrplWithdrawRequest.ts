import { u8aToHex } from "@polkadot/util";

import {
	ExtContext,
	XrplBridgeWithdrawRequestArgs,
	XrplBridgeWithdrawRequestItem,
} from "@trncs/xbd/commands/outbox/processRootSide";

export async function handleXrplWithdrawRequest(
	ctx: ExtContext,
	item: XrplBridgeWithdrawRequestItem,
	args: XrplBridgeWithdrawRequestArgs
): Promise<"skipped" | "done"> {
	const { store, log, slack } = ctx;
	const { proofId, sender } = args;
	const eventId = Number(proofId);

	const withdrawal = await store.txWithdrawal.findFirst({
		where: { eventId: eventId },
	});
	if (!withdrawal) {
		log.warn(`TxWithdrawal record with eventId #${eventId} is not found`);
		slack.warn(`TxWithdrawal record with eventId #${eventId} is not found`);
		return "skipped";
	}

	log.info(`update TxWithdrawal record with sender #${u8aToHex(sender)}`);
	store.$push(
		store.txWithdrawal.updateMany({
			where: { eventId: eventId },
			data: {
				sender: u8aToHex(sender),
				updatedAt: new Date(),
			},
		})
	);

	return "done";
}
