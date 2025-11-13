import { u8aToHex } from "@polkadot/util";
import { decode, SubmitMultisignedRequest, Transaction } from "xrpl";

import { checkXRPFeeBalance } from "@trncs/utils/checkXRPFeeBalance";
import { minXRPInWallet } from "@trncs/utils/config";
import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import { isStringInArray } from "@trncs/utils/isStringInArray";
import {
	EventSendArgs,
	EventSendItem,
	ExtContext,
} from "@trncs/xbd/commands/outbox/processRootSide";
import {
	devCallers,
	slackMentions,
	trnHttpEndpoints,
	xrplDoorAccount,
} from "@trncs/xbd/config";
import {
	Prisma,
	TxSignerSetChange,
	TxStatus,
	TxWithdrawal,
} from "@trncs/xbd/prisma";
import { PaymentTx, SignerListSetTx } from "@trncs/xbd/types";
import { fetchTxProof, TxProof } from "@trncs/xbd/utils/fetchTxProof";
import { getXrplClient } from "@trncs/xbd/utils/getXrplClient";

export async function handleEventSendEvent(
	ctx: ExtContext,
	item: EventSendItem,
	args: EventSendArgs
): Promise<void> {
	const logId = item.event.extrinsic?.id ?? item.event.id;
	const logIdType = item.event.extrinsic?.id ? "extrinsicId" : "eventItemId";
	const log = (ctx.log = ctx.log.child("EventSend"));
	const { slack } = ctx;

	log.info(`start with ${logIdType} #${logId}`);

	const { eventProofId, signingRequest } = args;

	const txBlob = u8aToHex(signingRequest.value);
	const tx = decode(txBlob.substring(2)) as unknown as Transaction;

	log.info(`fetch the proof for event with eventProofId #${eventProofId}`);
	const eventId = Number(eventProofId);
	let eventProof = null;
	try {
		eventProof = await fetchTxProof(trnHttpEndpoints, eventId);
	} catch (e: any) {
		const blockHeight = item.header.height;
		if (tx.TransactionType === "SignerListSet") {
			slack.error(
				`Authority set change record with no event proof for eventId #${eventId} and block #${blockHeight}, ATN: ${slackMentions}`
			);
		} else {
			slack.warn(
				`Skipping proof as ${e.message}, for eventId #${eventId} and block #${blockHeight}`
			);
		}
		return;
	}
	const { asSigners } = eventProof as TxProof;

	const input: Pick<
		TxSignerSetChange | TxWithdrawal,
		"eventId" | "eventBlob" | "eventSigners"
	> = {
		eventId,
		eventBlob: txBlob,
		eventSigners: asSigners as unknown as Prisma.JsonArray,
	};
	let output: string | void = undefined;

	switch (tx.TransactionType) {
		case "Payment": {
			output = await handlePayment(ctx, item, tx as PaymentTx, input);
			break;
		}

		case "SignerListSet": {
			if (tx.Account === xrplDoorAccount) {
				output = await handleSignerSetChange(
					ctx,
					item,
					tx as SignerListSetTx,
					input
				);
			}
			break;
		}
	}

	if (output) log.info(output);
}

const SKIPPABLE_RESULTS = ["tefNO_TICKET"];
async function handlePayment(
	ctx: ExtContext,
	item: EventSendItem,
	tx: PaymentTx,
	input: Pick<TxWithdrawal, "eventId" | "eventBlob" | "eventSigners">
): Promise<"skipped" | "done"> {
	const { store, log, slack } = ctx;
	const { eventId } = input;
	let from: string | null = null,
		extrinsicId: string | null = null;
	const blockHeight = item.header.height;
	const amount = typeof tx.Amount === "string" ? tx.Amount : tx.Amount.value;
	const to = tx.Destination;

	// If a withdrawn event is re-fired by the chain, due to
	// `EthBridge.ProofDelayed` or `XRPLBridge.WithdrawDelayed`
	// In those cases: there won't be an extrinsic associate with the `EthBridge.EventSend` event
	// And we would need to either use `evenId` or a cluster of conditions to fetch the real
	// extrinsicId that has been stored previously when we handle those delayed events.
	if (!item.event.extrinsic) {
		let withdrawal = await store.txWithdrawal.findFirst({
			where: { eventId },
		});
		if (!withdrawal) {
			log.warn(`TxWithdrawal record with eventId #${eventId} is not found`);
			slack.warn(`TxWithdrawal record with eventId #${eventId} is not found`);

			const auxData = {
				delayedAmount: amount,
				releaseAtBlock: blockHeight,
			};

			withdrawal = await store.txWithdrawal.findFirst({
				where: {
					auxData: { equals: auxData },
					status: TxStatus.Delayed,
					to: to,
				},
			});
			if (!withdrawal) {
				log.warn(auxData, `TxWithdrawal record with auxData is not found`);
				slack.warn(
					`TxWithdrawal record with auxData #${JSON.stringify(
						auxData
					)} is not found`
				);
				return "skipped";
			}
		}

		extrinsicId = withdrawal.extrinsicId;
		from = withdrawal.from;
	}

	if (item.event.extrinsic) {
		extrinsicId = item.event.extrinsic.id;
		from = item.event.extrinsic.signature?.address as string;
	}

	if (!extrinsicId) {
		log.warn(`extrinsicId is null`);
		return "skipped";
	}

	if (isStringInArray(from, devCallers)) {
		log.info(
			`Ignore transaction with extrinsicId #${extrinsicId} since it was sent from a DEV account "${from}"`
		);
		return "skipped";
	}

	const xrpValue = {
		amount: typeof tx.Amount === "string" ? tx.Amount : tx.Amount.value,
		tokenName: typeof tx.Amount === "string" ? "XRP" : tx.Amount.currency,
	};
	const xrplClient = await getXrplClient();

	log.info(`upsert TxWithdrawal record with extrinsicId #${extrinsicId}`);
	store.$push(
		store.txWithdrawal.upsert(
			createModelUpsertArgs<TxWithdrawal, Prisma.TxWithdrawalUpsertArgs>(
				{ extrinsicId },
				{
					...input,
					extrinsicId,
					from,
					to,
					xrpValue,
					status: TxStatus.Processing,
				}
			)
		)
	);

	log.info(`submit extrinsic with extrinsicId #${extrinsicId} to XRPL`);
	const response = await xrplClient.request({
		command: "submit_multisigned",
		tx_json: { ...tx, Signers: input.eventSigners },
	} as unknown as SubmitMultisignedRequest);

	const matched = SKIPPABLE_RESULTS.some(
		(result) => response?.result?.engine_result === result
	);

	if (matched) {
		log.warn(
			`Ignore transaction with extrinsicId #${extrinsicId} since result "${response?.result?.engine_result}" is skippable`
		);
		return "skipped";
	}

	const [sufficient, currentAmount] = await checkXRPFeeBalance(
		xrplClient,
		xrplDoorAccount
	);
	if (!sufficient) {
		slack.warn(
			`Door account \`${xrplDoorAccount}\` XRP balance on XRPL is lower than ${minXRPInWallet} XRP), current balance is \`${currentAmount} XRP\`.`
		);
	}

	store.$push(
		store.txWithdrawal.updateMany({
			where: { eventId: input.eventId },
			data: {
				auxData: {
					xrplResponse: response?.result,
				} as unknown as Prisma.JsonValue,
				xrplHash: response?.result?.tx_json?.hash,
				status: TxStatus.Processing,
				updatedAt: new Date(),
			},
		})
	);

	return "done";
}

async function handleSignerSetChange(
	ctx: ExtContext,
	item: EventSendItem,
	tx: SignerListSetTx,
	input: Pick<TxSignerSetChange, "eventId" | "eventBlob" | "eventSigners">
): Promise<"skipped" | "done"> {
	const { store, log, slack } = ctx;
	const xrplClient = await getXrplClient();
	const eventId = input.eventId;

	log.info(`upsert TxSignerSetChange record with eventId #${eventId}`);
	store.$push(
		store.txSignerSetChange.upsert(
			createModelUpsertArgs<
				TxSignerSetChange,
				Prisma.TxSignerSetChangeUpsertArgs
			>(
				{ eventId },
				{
					...input,
					newSignerSet: tx.SignerEntries as unknown as Prisma.JsonArray,
					eventItemId: item.event.id,
					status: TxStatus.Processing,
				}
			)
		)
	);

	log.info(`submit event with eventId #${eventId} to XRPL`);
	const response = await xrplClient.request({
		command: "submit_multisigned",
		tx_json: { ...tx, Signers: input.eventSigners },
	} as unknown as SubmitMultisignedRequest);

	const [sufficient, currentAmount] = await checkXRPFeeBalance(
		xrplClient,
		xrplDoorAccount
	);
	if (!sufficient) {
		slack.warn(
			`Door account \`${xrplDoorAccount}\` XRP balance on XRPL is lower than ${minXRPInWallet} XRP), current balance is \`${currentAmount} XRP\`.`
		);
	}

	store.$push(
		store.txSignerSetChange.update({
			where: { eventId: input.eventId },
			data: {
				auxData: {
					xrplResponse: response?.result,
				} as unknown as Prisma.JsonValue,
				xrplHash: response?.result?.tx_json?.hash,
				status: TxStatus.Processing,
				updatedAt: new Date(),
			},
		})
	);

	return "done";
}
