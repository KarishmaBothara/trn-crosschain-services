import { BigNumber, utils } from "ethers";
import { Client, xrpToDrops } from "xrpl";

import { minXRPInWallet } from "@trncs/utils/config";

export async function checkXRPFeeBalance(xrpClient: Client, address: string) {
	const minimum = minXRPInWallet;
	const minimumAmount = BigNumber.from(xrpToDrops(minimum));
	const accountInfo = await xrpClient.request({
		command: "account_info",
		account: address,
	});
	const currentAmount = BigNumber.from(accountInfo.result.account_data.Balance);
	return [
		currentAmount.gte(minimumAmount),
		utils.formatUnits(currentAmount, 6),
	];
}
