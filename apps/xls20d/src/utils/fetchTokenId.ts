// Fetch token id from "NFTokenMint" tx
import { TransactionMetadata } from "xrpl";
import { Node } from "xrpl/dist/npm/models/transactions/metadata";
import { NFTokenMint } from "xrpl/dist/npm/models/transactions/NFTokenMint";

import {
	CreatedNode,
	MintTransaction,
	ModifiedNode,
} from "@trncs/xls20d/types";

export function fetchTokenId(txn: MintTransaction) {
	if (txn.meta.nftoken_id) return txn.meta.nftoken_id;
	const hexURI = (txn.tx as NFTokenMint).URI;
	let searchTokenId;
	(txn.meta as TransactionMetadata).AffectedNodes.find((node: Node) => {
		const nftTokens = (node as ModifiedNode)?.ModifiedNode?.FinalFields
			?.NFTokens;
		const token = nftTokens?.find((token) => token?.NFToken?.URI === hexURI);
		if (token) {
			searchTokenId = token?.NFToken?.NFTokenID;
			return true;
		}
	});
	if (searchTokenId) return searchTokenId;
	// Search in createdNode, if tokenId not found in ModifiedNode
	(txn.meta as TransactionMetadata).AffectedNodes.find((n: Node) => {
		const nftTokens = (n as CreatedNode).CreatedNode?.NewFields?.NFTokens;
		const token = nftTokens?.find((token) => token?.NFToken?.URI === hexURI);
		if (token) {
			searchTokenId = token?.NFToken?.NFTokenID;
			return true;
		}
	});
	return searchTokenId;
}
