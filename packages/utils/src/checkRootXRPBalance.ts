import { ApiPromise } from "@polkadot/api";
import { Option } from "@polkadot/types";
import { BigNumber, utils } from "ethers";
import { xrpToDrops } from "xrpl";

import { minXRPInWallet } from "@trncs/utils/config";

import { AssetBalance } from "./types";

export async function checkRootXRPBalance(
	api: ApiPromise,
	address: string
): Promise<[boolean, string]> {
	const minimum = minXRPInWallet;
	const minimumAmount = BigNumber.from(xrpToDrops(minimum));
	const balance = (await api.query.assets.account(
		2,
		address
	)) as Option<AssetBalance>;
	const currentAmount = BigNumber.from(balance.unwrap().balance.toString());

	return [
		currentAmount.gte(minimumAmount),
		utils.formatUnits(currentAmount, 6),
	];
}
