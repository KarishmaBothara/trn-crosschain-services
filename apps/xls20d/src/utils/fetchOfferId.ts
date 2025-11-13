import { convertHexToString, TransactionMetadata } from "xrpl";
import { Memo } from "xrpl/dist/npm/models/common";
import { Node } from "xrpl/dist/npm/models/transactions/metadata";
import { NFTokenCreateOffer } from "xrpl/dist/npm/models/transactions/NFTokenCreateOffer";

import { CreatedNode, MintTransaction } from "@trncs/xls20d/types";

export function fetchOfferDetails(
	txn: MintTransaction
): { nftId: string; offerId: string; recipient: string } | null {
	const { Memos } = txn.tx as NFTokenCreateOffer;
	const nftId = (txn.tx as NFTokenCreateOffer).NFTokenID;
	let offerId;
	if (txn.meta.offer_id) offerId = txn.meta.offer_id;
	if (!offerId) {
		const createOffer = (txn.meta as TransactionMetadata).AffectedNodes.find(
			(node: Node) =>
				(node as CreatedNode)?.CreatedNode.LedgerEntryType === "NFTokenOffer"
		);
		offerId = (createOffer as CreatedNode)?.CreatedNode?.LedgerIndex;
	}
	if (!Memos?.[0]?.Memo?.MemoData || !Memos?.[0]?.Memo?.MemoType) return null;

	const memoType = convertHexToString(Memos[0].Memo.MemoType);
	const memoDataHex = (Memos as unknown as Memo[])[0].Memo.MemoData;
	const memoData = convertHexToString(memoDataHex as string);
	let recipient = "-";
	if (memoType === "Address") {
		recipient = memoData;
	}
	return { nftId, offerId, recipient };
}
