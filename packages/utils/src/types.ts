import { SubmittableExtrinsic } from "@polkadot/api/types";
import { Struct } from "@polkadot/types/codec";
import { Balance } from "@polkadot/types/interfaces";
import { ISubmittableResult } from "@polkadot/types/types";
import { createLogger } from "@subsquid/logger";

export type Extrinsic = SubmittableExtrinsic<"promise", ISubmittableResult>;

export interface AssetBalance extends Struct {
	balance: Balance;
}

export type Logger = ReturnType<typeof createLogger>;
