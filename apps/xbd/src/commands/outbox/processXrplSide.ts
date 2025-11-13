import { createLogger } from "@subsquid/logger";
import { TransactionMetadata } from "xrpl";

import { xrplDoorAccount } from "@trncs/xbd/config";
import { handlePaymentTx } from "@trncs/xbd/mappings/outbox/handlePaymentTx";
import { handleSignerListSetTx } from "@trncs/xbd/mappings/outbox/handleSignerListSetTx";
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
export const desc = `Process outgoing transactions from "${xrplDoorAccount}"`;

const slack = createSlackLogger(LoggerChannel.Outgoing, LoggerChild.Xrpl);
const processor = createXrplProcessor<Store>();

export async function handler() {
	createLogger("xrp").info(
		`channel: Outbox, network: XRPL, door: ${xrplDoorAccount}`
	);
	const [xrplClient, prismaClient] = await Promise.all([
		getXrplClient(),
		getPrismaClient(),
	]);
	processor
		.setClient(xrplClient)
		.run(
			createProxyDatabase(prismaClient, StatusCollection.ObxXrplStatus, "XBD"),
			async (ctx) => {
				const { txns, log, store } = ctx;
				try {
					const entries = txns.map(mapValidTransaction).entries();

					for (const [index, entry] of entries) {
						if (!entry) continue;
						const [tx, meta] = entry;
						switch (tx?.TransactionType) {
							case "Payment": {
								if (!isWithdrawalTx(tx)) continue;
								await handlePaymentTx({ ...ctx, index, slack }, { tx, meta });
								break;
							}

							case "SignerListSet": {
								await handleSignerListSetTx(
									{ ...ctx, index, slack },
									{ tx, meta }
								);
								break;
							}
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

	return [tx, meta as TransactionMetadata];
}

function isWithdrawalTx(tx: AccountTransaction["tx"]): boolean {
	const { Account, hash, TransactionType } = tx as PaymentTx;

	if (!hash || !Account || TransactionType !== "Payment") return false;

	if (Account.toLowerCase() !== xrplDoorAccount.toLowerCase()) return false;

	return true;
}
