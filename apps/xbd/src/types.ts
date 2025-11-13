import { AccountTxResponse, Transaction } from "xrpl";
import { ResponseOnlyTxInfo } from "xrpl/dist/npm/models/common";

export enum StatusCollection {
	IbxRootStatus = "IbxRootStatus",
	IbxXrplStatus = "IbxXrplStatus",
	ObxRootStatus = "ObxRootStatus",
	ObxXrplStatus = "ObxXrplStatus",
	TckRootStatus = "TckRootStatus",
}

export type PaymentTx = Extract<Transaction, { TransactionType: "Payment" }> &
	ResponseOnlyTxInfo;
export type SignerListSetTx = Extract<
	Transaction,
	{ TransactionType: "SignerListSet" }
> &
	ResponseOnlyTxInfo;

export type AccountTransaction =
	AccountTxResponse["result"]["transactions"][number];
