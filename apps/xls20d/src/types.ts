import { AccountTxResponse, Transaction } from "xrpl";
import { ResponseOnlyTxInfo } from "xrpl/dist/npm/models/common";

export enum StatusCollection {
	IbxRootStatus = "IbxRootStatus",
	IbxXrplStatus = "IbxXrplStatus",
	ObxRootStatus = "ObxRootStatus",
	ObxXrplStatus = "ObxXrplStatus",
	TckRootStatus = "TckRootStatus",
}

export enum ROLE {
	OUTBOX_ROLE = "OUTBOX_ROLE",
	INBOX_ROLE = "INBOX_ROLE",
}

export type NFTTx = Extract<
	Transaction,
	{
		TransactionType:
			| "NFTokenMint"
			| "NFTokenCreateOffer"
			| "Payment"
			| "NFTokenAcceptOffer";
	}
> &
	ResponseOnlyTxInfo;

export type AccountTransaction =
	AccountTxResponse["result"]["transactions"][number];

export type MintTransaction = AccountTransaction & { tx: NFTTx };

export type MintRequest = {
	tokenId: string;
	collectionId?: string;
	serialId?: string;
	hash?: string;
};

export interface CreatedNode {
	CreatedNode: {
		LedgerEntryType: string;
		LedgerIndex: string;
		NewFields: {
			[field: string]: unknown;
		};
	};
}
export interface ModifiedNode {
	ModifiedNode: {
		LedgerEntryType: string;
		LedgerIndex: string;
		FinalFields?: {
			[field: string]: unknown;
		};
		PreviousFields?: {
			[field: string]: unknown;
		};
		PreviousTxnID?: string;
		PreviousTxnLgrSeq?: number;
	};
}
export interface DeletedNode {
	DeletedNode: {
		LedgerEntryType: string;
		LedgerIndex: string;
		FinalFields: {
			[field: string]: unknown;
		};
	};
}

export interface NodeTokenIdObj {
	NFToken: {
		URI: string;
		NFTokenID: string;
	};
}
export interface NFToken {
	nft_id: string;
	ledger_index: number;
	owner: string;
	is_burned: boolean;
	flags: number;
	transfer_fee: number;
	issuer: string;
	nft_taxon: number;
	nft_serial: number;
	uri: string;
}

export type SignerListSetTx = Extract<
	Transaction,
	{ TransactionType: "SignerListSet" }
> &
	ResponseOnlyTxInfo;
