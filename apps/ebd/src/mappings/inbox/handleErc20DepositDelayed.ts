import { u8aToHex } from "@polkadot/util";

import {
	Erc20DepositDelayedArgsV54,
	Erc20DepositDelayedItem,
	ExtContext,
} from "@trncs/ebd/commands/inbox/processRootSide";
import { slackMentions } from "@trncs/ebd/config";

export async function handleErc20DepositDelayed(
	ctx: ExtContext,
	item: Erc20DepositDelayedItem,
	args: Erc20DepositDelayedArgsV54
): Promise<void> {
	const { slack } = ctx;
	const log = ctx.log.child("DepositDelayed");
	let paymentId: bigint,
		blockNumber: number,
		amount: bigint,
		beneficiary: Uint8Array;
	if (Array.isArray(args)) {
		[paymentId, blockNumber, amount, beneficiary] = args;
	} else {
		({ beneficiary, paymentId, amount, scheduledBlock: blockNumber } = args);
	}

	log.warn(
		`Received deposit delayed event at block #${
			item.header.height
		}, paymentId: ${paymentId}, releaseAtBlockNumber: ${blockNumber}, amount: ${amount}, beneficiary: ${u8aToHex(
			beneficiary
		)}`
	);
	slack.warn(
		`Received deposit delayed event at block #${
			item.header.height
		}, paymentId: ${paymentId}, releaseAtBlockNumber: ${blockNumber}, amount: ${amount}, beneficiary: ${u8aToHex(
			beneficiary
		)}

ATN: ${slackMentions}`
	);
}
