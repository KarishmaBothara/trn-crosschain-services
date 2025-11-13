import { createLogger } from "@subsquid/logger";
import {
	BatchContext,
	SubstrateBatchProcessor,
} from "@subsquid/substrate-processor";
import { Database } from "@subsquid/substrate-processor/lib/interfaces/db";

// Have to extract Item type out of the original class, otherwise TS will complain
// about incompatible types
type GenericType<T> = T extends SubstrateBatchProcessor<infer U> ? U : never;
type Item = GenericType<SubstrateBatchProcessor>;

/**
 * Initialise a substrate processor with basic default options
 * @param archiveEndpoint Substrate archive endpoint
 * @returns An instance of a batch processor
 */
export function createSubstrateProcessor(
	archiveEndpoint: string
): RootBatchProcessor {
	return new RootBatchProcessor().setDataSource({
		archive: archiveEndpoint,
	});
}

class RootBatchProcessor extends SubstrateBatchProcessor<Item> {
	private initialBlockHeight = 0;

	constructor() {
		super();
		// Hack: change to different namespace for the logger
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this as any).getLogger = () => {
			return createLogger("trn:procr");
		};
	}

	public setInitialBlockHeight(height: number): this {
		this.initialBlockHeight = height;
		return this;
	}

	run<Store>(
		db: Database<Store>,
		handler: (ctx: BatchContext<Store, Item>) => Promise<void>
	): void {
		db.connect().then((height) => {
			if (height < 0 && this.initialBlockHeight)
				this.setBlockRange({ from: this.initialBlockHeight });

			super.run(db, handler);
		});
	}
}
