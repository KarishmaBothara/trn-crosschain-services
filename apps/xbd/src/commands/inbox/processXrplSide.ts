import { createLogger } from "@subsquid/logger";
import { utils } from "ethers";
import { convertHexToString, TransactionMetadata } from "xrpl";

import { minAmountThreshold, xrplDoorAccount } from "@trncs/xbd/config";
import { handlePaymentTx } from "@trncs/xbd/mappings/inbox/handlePaymentTx";
import {
	AccountTransaction,
	PaymentTx,
	StatusCollection,
} from "@trncs/xbd/types";
import {
	createProxyDatabase,
	Store,
} from "@trncs/xbd/utils/createProxyDatabase";
import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/xbd/utils/createSlackLogger";
import {
	Context,
	createXrplProcessor,
} from "@trncs/xbd/utils/createXrplProcessor";
import { getPrismaClient } from "@trncs/xbd/utils/getPrismaClient";
import { getXrplClient } from "@trncs/xbd/utils/getXrplClient";

export type ExtContext = Context<Store> & {
	slack: typeof slack;
	index: number;
};

export const command = "processXrplSide";
export const desc = `Process incoming transactions from "${xrplDoorAccount}"`;

const slack = createSlackLogger(LoggerChannel.Incoming, LoggerChild.Xrpl);
const processor = createXrplProcessor<Store>();

export async function handler() {
	createLogger("xrp").info(
		`channel: Inbox, network: XRPL, door: ${xrplDoorAccount}`
	);
	const prismaClient = getPrismaClient();
	const xrplClient = await getXrplClient();
	await processor
		.setClient(xrplClient)
		.run(
			createProxyDatabase(prismaClient, StatusCollection.IbxXrplStatus, "XBD"),
			async (ctx) => {
				const { txns, log, store } = ctx;
				try {
					const entries = txns.map(mapValidTransaction).entries();
					for (const [index, entry] of entries) {
						if (!entry) continue;
						const [tx] = entry;
						switch (tx?.TransactionType) {
							case "Payment":
								if (!isDepositTx(tx)) continue;

								await handlePaymentTx(
									{ ...ctx, index, slack },
									getTxWithDeliveredAmount(entry)
								);
								break;
						}

						await store.$commit(tx.ledger_index!, slack);
					}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} catch (error: any) {
					log.fatal(error?.message ?? error);
					slack.fatal(error?.message ?? error);
					await prismaClient.$disconnect();
					process.exit(1);
				}
			}
		);
}

function mapValidTransaction({
	meta,
	tx,
	validated,
}: AccountTransaction):
	| [NonNullable<AccountTransaction["tx"]>, TransactionMetadata]
	| undefined {
	if (!meta || !tx || !validated) return;

	if (typeof meta === "string" || !tx.ledger_index) return;

	if (!meta?.delivered_amount || meta?.delivered_amount === "unavailable")
		return;

	if (typeof (meta.delivered_amount) === 'string') {
		// check for min threshold for XRP transfer
		if (parseInt(meta.delivered_amount) < minAmountThreshold) {
			slack.warn(`Min threshold amount condition not satisfied for tx ${JSON.stringify(tx)}`);
			return;
		}
	}

	const { TransactionResult } = meta as TransactionMetadata;

	if (TransactionResult !== "tesSUCCESS") return;

	return [tx, meta as TransactionMetadata];
}

function isDepositTx(tx: AccountTransaction["tx"]): boolean {
	const { Destination, hash, Memos, TransactionType } = tx as PaymentTx;

	if (!hash || !Destination || TransactionType !== "Payment") return false;

	if (Destination.toLowerCase() !== xrplDoorAccount.toLowerCase()) return false;

	if (!Memos?.[0]?.Memo?.MemoData || !Memos?.[0]?.Memo?.MemoType) return false;

	const memoData = convertHexToString(Memos[0].Memo.MemoData);
	const memoType = convertHexToString(Memos[0].Memo.MemoType);

	if (memoType !== "Address" || !utils.isAddress(memoData)) return false;

	return true;
}

function getTxWithDeliveredAmount([tx, meta]: [
	NonNullable<AccountTransaction["tx"]>,
	TransactionMetadata
]): PaymentTx {
	return {
		...(tx as PaymentTx),
		Amount: meta.delivered_amount!,
	};
}
