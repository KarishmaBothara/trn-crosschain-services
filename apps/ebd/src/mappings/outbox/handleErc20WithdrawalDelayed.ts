import { u8aToHex } from "@polkadot/util";
import { utils } from "ethers";

import {
	Erc20WithdrawalDelayedArgsV54,
	Erc20WithdrawalDelayedItem,
	ExtContext,
} from "@trncs/ebd/commands/outbox/processRootSide";
import { slackMentions } from "@trncs/ebd/config";
import { Prisma, TxStatus, TxWithdrawal } from "@trncs/ebd/prisma";
import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";

export async function handleErc20WithdrawalDelayed(
	ctx: ExtContext,
	item: Erc20WithdrawalDelayedItem,
	args: Erc20WithdrawalDelayedArgsV54
): Promise<void> {
	const { store, slack } = ctx;
	const log = ctx.log.child("WithdrawalDelayed");
	if (!item.event.extrinsic) {
		log.info(`Skipping withdrawal delayed event with args #${args.toString()}`);
		slack.warn(
			`Skipping withdrawal delayed event with args #${args.toString()}`
		);
		return;
	}
	let paymentId: bigint,
		blockNumber: number,
		amount: bigint,
		beneficiary: Uint8Array,
		from: Uint8Array;
	if (Array.isArray(args)) {
		[paymentId, blockNumber, amount, beneficiary] = args;
	} else {
		({
			source: from,
			beneficiary,
			paymentId,
			amount,
			scheduledBlock: blockNumber,
		} = args);
	}
	const extrinsicId = item.event.extrinsic!.id;
	from = utils.getAddress(u8aToHex(from));
	const to = utils.getAddress(u8aToHex(beneficiary));
	log.info(`start with extrinsicId #${extrinsicId}`);

	slack.warn(
		`Received withdrawal delayed event at extrinsicId #${extrinsicId}, paymentId: ${paymentId}, releaseAtBlockNumber: ${blockNumber}, amount: ${amount}, beneficiary: ${to}

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
						releaseAtBlock: blockNumber,
					},
				}
			)
		)
	);

	log.info("done");
}
