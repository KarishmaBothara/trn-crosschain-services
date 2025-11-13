import { u8aToHex } from "@polkadot/util";
import { decode, SubmitMultisignedRequest, Transaction } from "xrpl";
import { NFTokenAcceptOffer } from "xrpl/dist/npm/models/transactions/NFTokenAcceptOffer";
import { NFTokenCreateOffer } from "xrpl/dist/npm/models/transactions/NFTokenCreateOffer";

import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import {
	EventSendArgs,
	EventSendItem,
	ExtContext,
} from "@trncs/xls20d/commands/outbox/processRootSide";
import { trnHttpEndpoints, xrplMinterAccount } from "@trncs/xls20d/config";
import {
	NFTStatus,
	Prisma,
	TxDeposit,
	TxSignerSetChange,
	TxStatus,
	TxWithdrawal,
} from "@trncs/xls20d/prisma";
import { SignerListSetTx } from "@trncs/xls20d/types";
import { fetchTxProof, TxProof } from "@trncs/xls20d/utils/fetchTxProof";
import { getXrplClient } from "@trncs/xls20d/utils/getXrplClient";

// Function has signed tx details to relay NFTokenCreate/NFTokenAccept offer to door account
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
		if (
			tx.TransactionType === "NFTokenAcceptOffer" ||
			tx.TransactionType === "NFTokenCreateOffer" ||
			tx.TransactionType === "SignerListSet"
		) {
			slack.error(
				`${tx.TransactionType} with no event proof for eventId #${eventId} and block #${blockHeight}`
			);
		} else {
			slack.warn(
				`Skipping proof as ${e.message}, for eventId #${eventId} and block #${blockHeight}`
			);
			return;
		}
	}
	const { asSigners } = eventProof as TxProof;

	const input: Pick<TxWithdrawal | TxSignerSetChange, "eventId" | "eventBlob" | "eventSigners"> = {
		eventId,
		eventBlob: txBlob,
		eventSigners: asSigners as unknown as Prisma.JsonArray,
	};
	let output: string | void = undefined;

	switch (tx.TransactionType) {
		case "NFTokenAcceptOffer": {
			output = await executeNFTokenAcceptOfferonXRPL(
				ctx,
				item,
				tx as NFTokenAcceptOffer,
				input
			);
			break;
		}
		case "NFTokenCreateOffer": {
			output = await executeNFTokenCreateOfferonXRPL(
				ctx,
				item,
				tx as NFTokenCreateOffer,
				input
			);
			break;
		}
		case "SignerListSet": {
			if (tx.Account === xrplMinterAccount) {
				output = await handleSignerSetChange(
					ctx,
					item,
					tx as SignerListSetTx,
					input as TxSignerSetChange
				);
			}
			break;
		}
	}

	if (output) log.info(output);
}

// Part of deposit, although this is TRN->XRPL side to relay NFTokenAccept offer
async function executeNFTokenAcceptOfferonXRPL(
	ctx: ExtContext,
	item: EventSendItem,
	tx: NFTokenAcceptOffer,
	input: Pick<TxWithdrawal, "eventId" | "eventBlob" | "eventSigners">
): Promise<"skipped" | "done"> {
	const { store, log } = ctx;
	let extrinsicId: string | null = null;
	const offerId = tx.NFTokenSellOffer;
	const tokenDetails = await store.nftOffer.findFirst({
		where: { offerId: offerId },
	});
	if (!tokenDetails) {
		log.warn(`Create offer for this accept offer does not exist`);
		return "skipped";
	}
	const { nftId } = tokenDetails;
	if (item.event.extrinsic) {
		extrinsicId = item.event.extrinsic.id;
	}

	if (!extrinsicId) {
		log.warn(`extrinsicId is null`);
		return "skipped";
	}

	const xrplClient = await getXrplClient();

	log.info(`submit extrinsic with extrinsicId #${extrinsicId} to XRPL`);
	const response = await xrplClient.request({
		command: "submit_multisigned",
		tx_json: { ...tx, Signers: input.eventSigners },
	} as unknown as SubmitMultisignedRequest);
	log.info(`Submitted xrpl transaction, response: ${JSON.stringify(response)}`);
	const xrplHash = response?.result?.tx_json?.hash;

	log.info(`upsert TxDeposit record with extrinsicId #${extrinsicId}`);
	// XRPL -> TRN
	// Get record for offer created record for door account for this nft and update the status to offer accepted by door account
	// with new xrpl hash and extrinsic id
	const record = await store.txDeposit.findFirst({
		where: {
			nftId: nftId,
			status: NFTStatus.OfferCreatedForDoorAccount
		}
	});
	if (record) {
		await store.txDeposit.upsert(
			createModelUpsertArgs<TxDeposit, Prisma.TxDepositUpsertArgs>(
				{
					id: record.id,
				},
				{
					nftId: nftId,
					status: NFTStatus.OfferAcceptedByDoorAccount,
					extrinsicId,
					xrplHash: xrplHash,
				}
			)
		);
	} else {
		log.warn(`Missing record for nft create offer for door account - nftId: ${nftId} `);
	}

	return "done";
}

// Part of withdrawal or TRN->XRPL side so add entry to withdrawal collection
async function executeNFTokenCreateOfferonXRPL(
	ctx: ExtContext,
	item: EventSendItem,
	tx: NFTokenCreateOffer,
	input: Pick<TxWithdrawal, "eventId" | "eventBlob" | "eventSigners">
): Promise<"skipped" | "done"> {
	const { store, log } = ctx;
	let extrinsicId: string | null = null;
	let from = "";
	const nftId = tx.NFTokenID;
	const to = tx.Destination;

	if (item.event.extrinsic) {
		extrinsicId = item.event.extrinsic.id;
		from = item.event.extrinsic.signature?.address as string;
	}

	if (!extrinsicId) {
		log.warn(`extrinsicId is null`);
		return "skipped";
	}

	const xrplClient = await getXrplClient();

	log.info(`submit extrinsic with extrinsicId #${extrinsicId} to XRPL`);
	const response = await xrplClient.request({
		command: "submit_multisigned",
		tx_json: { ...tx, Signers: input.eventSigners },
	} as unknown as SubmitMultisignedRequest);
	log.info(`Submitted xrpl transaction, response: ${response}`);
	const xrplHash = response?.result?.tx_json?.hash;
	console.log('xrplHash::',xrplHash);

	log.info(`upsert TxWithdrawal record with extrinsicId #${extrinsicId}`);
	await store.txWithdrawal.upsert(
		createModelUpsertArgs<TxWithdrawal, Prisma.TxWithdrawalUpsertArgs>(
			{
				extrinsicId,
			},
			{
				nftId: nftId,
				status: NFTStatus.OfferCreatedByDoorAccount,
				extrinsicId,
				xrplHash: xrplHash,
				from,
				to,
			}
		)
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
	await store.txSignerSetChange.upsert(
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
	);

	log.info(`submit event with eventId #${eventId} to XRPL`);
	const response = await xrplClient.request({
		command: "submit_multisigned",
		tx_json: { ...tx, Signers: input.eventSigners },
	} as unknown as SubmitMultisignedRequest);

	await store.txSignerSetChange.update({
		where: { eventId: input.eventId },
		data: {
			auxData: {
				xrplResponse: response?.result,
			} as unknown as Prisma.JsonValue,
			xrplHash: response?.result?.tx_json?.hash,
			status: TxStatus.Processing,
			updatedAt: new Date(),
		},
	});

	return "done";
}
