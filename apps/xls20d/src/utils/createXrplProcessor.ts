import { createLogger, Logger } from "@subsquid/logger";
import { Database } from "@subsquid/substrate-processor/lib/interfaces/db";
import assert from "assert";
import { AccountTxResponse, Client as XrplClient } from "xrpl";

import { waitFor } from "@trncs/utils/waitFor";
import { jenCollections, xrplMinterAccount } from "@trncs/xls20d/config";
import { xrplProcessorDuration } from "@trncs/xls20d/config";
import { fetchXRPLWallet } from "@trncs/xls20d/utils/isJENCollection";

import { MintTransaction } from "../types";

type Marker = AccountTxResponse["result"]["marker"];

export interface Context<S> {
	store: S;
	txns: MintTransaction[];
	log: Logger;
}

export function createXrplProcessor<S>(): XrplProcessor<S> {
	return new XrplProcessor<S>();
}

export class XrplProcessor<S> {
	public client?: XrplClient;
	private startingIndex?: number;

	public setClient(client: XrplClient): this {
		this.client = client;
		return this;
	}

	public setStartingIndex(index: number): this {
		this.startingIndex = index;
		return this;
	}

	private async getCurrentLedgerIndex(): Promise<number> {
		assert(this.client);

		const ledger = await this.client.request({
			command: "ledger",
			ledger_index: "validated",
		});

		return ledger.result.ledger_index;
	}

	public async run(
		store: Database<S>,
		callback: (ctx: Context<S>) => Promise<void>
	) {
		assert(this.client);
		await this.client.connect();
		const jenWalletAddress = fetchXRPLWallet(
			parseInt(jenCollections[0])
		).address;
		let marker: Marker;
		let heightAtStart = await store.connect();
		const log = createLogger("xrp:procr");

		if (heightAtStart < 0)
			heightAtStart = (await this.getCurrentLedgerIndex()) - 1;

		if (heightAtStart >= 0)
			log.info(`last processed index was ${heightAtStart}`);

		let startIndex = Math.max(heightAtStart + 1, this.startingIndex ?? 0);

		do {
			const query = await this.client.request({
				command: "account_tx",
				account: xrplMinterAccount!,
				ledger_index_min: startIndex,
				ledger_index_max: -1,
				binary: false,
				forward: true,
				marker,
			});
			const {
				result: {
					transactions,
					ledger_index_min: indexMin,
					ledger_index_max: indexMax,
				},
			} = query;
			const indexCount = indexMax - indexMin;

			log.info(
				`at range [${indexMin},${indexMax}], ${indexCount} indices, ${transactions.length} transactions`
			);

			const query2 = await this.client.request({
				command: "account_tx",
				account: jenWalletAddress!,
				ledger_index_min: startIndex,
				ledger_index_max: -1,
				binary: false,
				forward: true,
				marker,
			});
			const transactions1 =
				(query2 as AccountTxResponse)?.result?.transactions || [];

			log.info(
				`at range [${indexMin},${indexMax}], ${indexCount} indices, ${transactions1.length} transactions`
			);

			await store.transact(indexMin, indexMax, async (store) => {
				await callback({
					store,
					txns: [...transactions, ...transactions1] as MintTransaction[],
					log: log.child("mapping"),
				});
			});

			startIndex = indexMax + 1;
			marker = query.result.marker;

			await waitFor(xrplProcessorDuration);
			//eslint-disable-next-line no-constant-condition
		} while (true);
	}
}
