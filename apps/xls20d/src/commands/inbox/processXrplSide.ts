import { convertHexToString, TransactionMetadata } from "xrpl";
import { NFTokenCreateOffer } from "xrpl/dist/npm/models/transactions/NFTokenCreateOffer";

import { tokenBridgeFee, xrplMinterAccount } from "@trncs/xls20d/config";
import { handleNFTokenCreateOfferTx } from "@trncs/xls20d/mappings/inbox/handleNFTokenCreateOfferTx";
import { handlePaymentTx } from "@trncs/xls20d/mappings/inbox/handlePaymentTx";
import {
	AccountTransaction,
	MintTransaction,
	StatusCollection,
} from "@trncs/xls20d/types";
import {
	createMongoDatabase,
	Store,
} from "@trncs/xls20d/utils/createMongoDatabase";
import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/xls20d/utils/createSlackLogger";
import {
	Context,
	createXrplProcessor,
} from "@trncs/xls20d/utils/createXrplProcessor";
import { getPrismaClient } from "@trncs/xls20d/utils/getPrismaClient";
import { getXrplClient } from "@trncs/xls20d/utils/getXrplClient";

export type ExtContext = Context<Store> & {
	slack: typeof slack;
	index?: number;
};

export const command = "processXrplSide";
export const desc = `Process incoming transactions from "${xrplMinterAccount}"`;

export const slack = createSlackLogger(
	LoggerChannel.Incoming,
	LoggerChild.Xrpl
);
const processor = createXrplProcessor<Store>();

export async function handler() {
	const prismaClient = getPrismaClient();
	const xrplClient = await getXrplClient();
	console.info(`
		Channel: Incoming
		Network: XRPL
		Door Account: "${xrplMinterAccount}"
	`);

	await processor
		.setClient(xrplClient)
		.run(
			createMongoDatabase(
				prismaClient,
				StatusCollection.IbxXrplStatus,
				"XLS20D"
			),
			async (ctx: Context<Store>) => {
				const { txns, store, log } = ctx;
				try {
					for (const [, txn] of txns
						.filter(filterIncomingTransactions)
						.entries()) {
						switch (txn?.tx?.TransactionType) {
							case "NFTokenCreateOffer":
								if (checkValidCreateOffer(txn)) {
									await handleNFTokenCreateOfferTx(txn, store, log);
								} else {
									log.info(
										`Created offer with non zero amount or invalid memo field ${txn.tx}`
									);
									slack.warn(
										`[XLS20D][NFTokenCreateOffer] to door account is with non zero amount or invalid memo field ${txn.tx}`
									);
								}
								break;
							case "Payment":
								{
									if (checkValidPayment(txn)) {
										await handlePaymentTx(txn, { ...ctx, slack });
									} else {
										log.info(
											`Payment with incorrect transfer fee or invalid memo field ${txn.tx}`
										);
										slack.warn(
											`[XLS20D][Payment] to door account is with incorrect transfer fee or invalid memo field ${txn.tx}`
										);
									}
								}
								break;
						}
					}

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} catch (error: any) {
					log.fatal(error);
					slack.fatal(error?.message ?? error);
					await prismaClient.$disconnect();
					process.exit(1);
				}
			}
		);
}

// Filter tx to get all success Payment tx and nft Create offer tx coming to door account (destination is door account)
function filterIncomingTransactions(txn: AccountTransaction) {
	if (!txn.tx) return false;

	const { tx, validated, meta } = txn;
	if (!validated) return false;
	const { TransactionResult } = meta as TransactionMetadata;
	const { Destination, TransactionType } = tx as NFTokenCreateOffer;

	if (
		TransactionResult !== "tesSUCCESS" ||
		Destination?.toLowerCase() !== xrplMinterAccount?.toLowerCase()
	)
		return false;
	if (TransactionType !== "NFTokenCreateOffer" && TransactionType !== "Payment")
		return false;

	return true;
}

// For payment to be valid, the memo: { "NFToken": "00080000.." } and amount is greater than or equal to bridge fee
function checkValidPayment(txn: MintTransaction) {
	const { Memos } = txn.tx as NFTokenCreateOffer;
	if (!Memos?.[0]?.Memo?.MemoData || !Memos?.[0]?.Memo?.MemoType) return false;
	const memoType = convertHexToString(Memos[0].Memo.MemoType);

	if (memoType !== "NFToken") return false;

	return (
		parseInt(
			((txn.meta as TransactionMetadata)?.delivered_amount as string) || "0"
		) >= tokenBridgeFee
	);
}

// NFT create offer for door account is valid, when memo: { "Address": "0x2425..." } and amount is zero
function checkValidCreateOffer(txn: MintTransaction) {
	const { Memos } = txn.tx as NFTokenCreateOffer;
	if (!Memos?.[0]?.Memo?.MemoData || !Memos?.[0]?.Memo?.MemoType) return false;
	const memoType = convertHexToString(Memos[0].Memo.MemoType);

	if (memoType !== "Address") return false;

	return (txn.tx as NFTokenCreateOffer).Amount === "0";
}
