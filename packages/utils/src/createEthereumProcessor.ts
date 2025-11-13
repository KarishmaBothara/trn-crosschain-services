import { BaseProvider } from "@ethersproject/providers";
import { createLogger, Logger } from "@subsquid/logger";
import { Database } from "@subsquid/substrate-processor/lib/interfaces/db";
import assert from "assert";
import { Contract, Event, EventFilter } from "ethers";

import { waitFor } from "@trncs/utils/waitFor";

export interface Context<S> {
	store: S;
	events: Event[];
	log: Logger;
}

export function createEthereumProcessor<S>(): EthereumProcessor<S> {
	return new EthereumProcessor<S>();
}

export class EthereumProcessor<S> {
	private eventFilter?: string | EventFilter;
	private startingBlock?: number;
	private contract?: Contract;
	private provider?: BaseProvider;
	private blockDelay = 1;

	public setProvider(provider: BaseProvider): this {
		this.provider = provider;
		return this;
	}

	public setContract(contract: Contract): this {
		this.contract = contract;
		return this;
	}

	public setStartingBlock(block: number): this {
		this.startingBlock = block;
		return this;
	}

	public setBlockDelay(delay: number): this {
		this.blockDelay = delay;
		return this;
	}

	public addEvent(event: string | EventFilter) {
		this.eventFilter = event;
		return this;
	}

	public async run(
		store: Database<S>,
		callback: (ctx: Context<S>) => Promise<void>
	) {
		assert(this.eventFilter);
		assert(this.contract);
		assert(this.provider);

		const log = createLogger("eth:procr");

		let heightAtStart = await store.connect();
		// We should never start to scan from block 0
		if (heightAtStart < 0)
			heightAtStart =
				(await this.provider.getBlockNumber()) - Math.max(1, this.blockDelay);

		if (heightAtStart >= 0) {
			log.info(
				`last processed block was ${heightAtStart} with block delay ${this.blockDelay}`
			);
		}

		let startBlock = Math.max(heightAtStart + 1, this.startingBlock ?? 0);

		do {
			const nextBlock = Math.max(
				startBlock,
				// Lag at-least a block behind for the logs to be consistent from block service
				// https://community.infura.io/t/logs-not-available-on-new-block-header-event/1458/2
				(await this.provider.getBlockNumber()) - Math.max(1, this.blockDelay)
			);

			if (nextBlock >= startBlock) {
				// fetch all events between the block ranges
				const events = await this.contract.queryFilter(
					this.eventFilter,
					startBlock,
					nextBlock
				);
				const blockCount = nextBlock - startBlock;

				log.info(
					`at range [${startBlock},${nextBlock}], ${blockCount} block(s), ${events.length} events`
				);

				await store.transact(startBlock, nextBlock, async (store) => {
					await callback({ store, events, log: log.child("mapping") });
				});
			}

			startBlock = nextBlock;

			await waitFor(30000);
			// eslint-disable-next-line no-constant-condition
		} while (true);
	}
}
