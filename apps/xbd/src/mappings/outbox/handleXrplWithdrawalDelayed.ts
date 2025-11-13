import { u8aToHex } from "@polkadot/util";
import { encodeAccountID } from "xrpl";

import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import {
	ExtContext,
	XrplBridgeWithdrawalDelayedArgs,
	XrplBridgeWithdrawalDelayedItem,
} from "@trncs/xbd/commands/outbox/processRootSide";
import { slackMentions } from "@trncs/xbd/config";
import { Prisma, TxStatus, TxWithdrawal } from "@trncs/xbd/prisma";

export async function handleXrplWithdrawalDelayed(
	ctx: ExtContext,
	item: XrplBridgeWithdrawalDelayedItem,
	args: XrplBridgeWithdrawalDelayedArgs
): Promise<void> {
	const { store, slack } = ctx;
	const log = ctx.log.child("WithdrawalDelayed");
	if (!item.event.extrinsic) {
		log.info(
			args,
			`Skipping withdrawal delayed event with args #${args.toString()}`
		);
		slack.warn(
			`Skipping withdrawal delayed event with args #${JSON.stringify(args)}`
		);
		return;
	}
	const { sender, amount, destination, delayedPaymentId, paymentBlock } = args;
	const from = u8aToHex(sender);
	const extrinsicId = item.event.extrinsic!.id;
	const to = encodeAccountID(
		Buffer.from(u8aToHex(destination).substring(2), "hex")
	); // Remove hex or '0x'
	log.info(`start with extrinsicId #${extrinsicId}, to #${to}`);
	slack.warn(
		`Received withdrawal delayed event at extrinsicId #${extrinsicId}, paymentId: ${delayedPaymentId},  
		amount: ${amount}, beneficiary: ${to}, releaseAtBlockNumber: ${paymentBlock},

ATN: ${slackMentions}`
	);

	log.info(`upsert TxWithdrawal record with extrinsicId #${extrinsicId}`);
	store.$push(
		store.txWithdrawal.upsert(
			createModelUpsertArgs<TxWithdrawal, Prisma.TxWithdrawalUpsertArgs>(
				{ extrinsicId },
				{
					extrinsicId,
					from,
					to,
					status: TxStatus.Delayed,
					auxData: {
						delayedAmount: amount.toString(),
						releaseAtBlock: paymentBlock,
					},
				}
			)
		)
	);

	log.info("done");
}
