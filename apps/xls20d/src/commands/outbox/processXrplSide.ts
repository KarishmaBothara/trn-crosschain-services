import { convertHexToString, Transaction, TransactionMetadata } from "xrpl";

import { jenCollections, xrplMinterAccount } from "@trncs/xls20d/config";
import { handleNFTokenAcceptOfferByDestinationTx } from "@trncs/xls20d/mappings/outbox/handleNFTokenAcceptOfferByDestinationTx";
import { handleNFTokenAcceptOfferTx } from "@trncs/xls20d/mappings/outbox/handleNFTokenAcceptOfferTx";
import {
	fulfillMintRequests,
	handleNFTokenMintTx,
} from "@trncs/xls20d/mappings/outbox/handleNFTokenMintTx";
import {
	AccountTransaction,
	MintRequest,
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
import { fetchXRPLWallet } from "@trncs/xls20d/utils/isJENCollection";

export type ExtContext = Context<Store> & {
	slack: typeof slack;
	index?: number;
};

export const command = "processXrplSide";
export const desc = `Process incoming transactions from "${xrplMinterAccount}"`;

export const slack = createSlackLogger(
	LoggerChannel.Outgoing,
	LoggerChild.Xrpl
);
const processor = createXrplProcessor<Store>();
let jenWalletAddress = "";

export async function handler() {
	const prismaClient = getPrismaClient();
	const xrplClient = await getXrplClient();
	jenWalletAddress = fetchXRPLWallet(parseInt(jenCollections[0])).address;
	console.info(`
Channel: Outgoing
Network: XRPL
Door Account: "${xrplMinterAccount}"
JEN Account: "${jenWalletAddress}"
`);

	await processor
		.setClient(xrplClient)
		.run(
			createMongoDatabase(
				prismaClient,
				StatusCollection.ObxXrplStatus,
				"XLS20D"
			),
			async (ctx: Context<Store>) => {
				const { txns, store, log } = ctx;
				try {
					const fufilMintDetails: MintRequest[] = [];
					for (const [, txn] of txns
						.filter(filterOutgoingTransactions)
						.entries()) {
						switch (txn?.tx?.TransactionType) {
							case "NFTokenMint":
								{
									const mintRequest = handleNFTokenMintTx(txn, log);
									if (mintRequest) fufilMintDetails.push(mintRequest);
								}
								break;
							// Offer accepted by door account, now submit transaction to trn
							case "NFTokenAcceptOffer":
								{
									await handleNFTokenAcceptOfferTx(txn, { ...ctx, slack });
								}
								break;
						}
					}

					// Not incoming nor outgoing, this will track all the AcceptOffer corresponding to CreateOffer created by door account
					// to mark the tx as complete in mongodb.
					for (const [, txn] of txns
						.filter(filterAcceptOfferTxForOfferCreatedFromDoorAccount)
						.entries()) {
						await handleNFTokenAcceptOfferByDestinationTx(txn, store, log);
					}

					// Once the for loop ends, collect all mint request and send it to fulfil
					if (fufilMintDetails.length > 0) {
						await fulfillMintRequests(
							{ ...ctx, slack, index: 0 },
							fufilMintDetails
						);
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

// Filter tx to get all success tx with memo either for RequestNonce (NFTokenMint) or for Address (NFTokenAcceptOffer)
function filterOutgoingTransactions(txn: AccountTransaction) {
	if (!txn.tx) return false;

	const { tx, validated, meta } = txn;
	const { TransactionResult } = meta as TransactionMetadata;
	const { Account, Memos, TransactionType } = tx as Transaction;
	if (!validated) return false;

	if (
		TransactionResult !== "tesSUCCESS" ||
		(Account?.toLowerCase() !== xrplMinterAccount?.toLowerCase() &&
			Account?.toLowerCase() !== jenWalletAddress?.toLowerCase())
	)
		return false;

	if (TransactionType === "NFTokenAcceptOffer") return true;

	if (!Memos?.[0]?.Memo?.MemoData || !Memos?.[0]?.Memo?.MemoType) return false;

	const memoType = convertHexToString(Memos[0].Memo.MemoType);

	if (
		memoType !== "RequestNonce" &&
		memoType !== "Address" &&
		memoType !== "FIFA_MINT"
	)
		return false;

	return true;
}

// Filter Accept offer tx for 'TokenCreateOffer' from door account
function filterAcceptOfferTxForOfferCreatedFromDoorAccount(
	txn: AccountTransaction
) {
	if (!txn.tx) return false;

	const { tx, validated, meta } = txn;
	const { TransactionResult } = meta as TransactionMetadata;
	const { Account, TransactionType } = tx as Transaction;
	if (!validated) return false;

	if (
		TransactionResult === "tesSUCCESS" &&
		Account?.toLowerCase() !== xrplMinterAccount?.toLowerCase() &&
		TransactionType === "NFTokenAcceptOffer"
	)
		return true;
	return false;
}
