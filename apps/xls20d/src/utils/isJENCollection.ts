import { Wallet } from "xrpl";

import {
	jenCollections,
	jenXrplMinterSeed,
	xrplMinterSeed,
} from "@trncs/xls20d/config";

function isJENCollection(collectionId: number) {
	return jenCollections.includes(collectionId.toString());
}

export function fetchXRPLWallet(collectionId: number) {
	return isJENCollection(collectionId)
		? Wallet.fromSeed(jenXrplMinterSeed)
		: Wallet.fromSeed(xrplMinterSeed);
}
