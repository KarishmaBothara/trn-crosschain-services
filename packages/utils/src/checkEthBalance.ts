import { Provider } from "@ethersproject/abstract-provider";
import { formatEther, parseEther } from "ethers/lib/utils";

import { minEthInWallet } from "@trncs/utils/config";

export async function checkEthBalance(provider: Provider, address: string) {
	const etherAmount = minEthInWallet;
	const minimumAmount = parseEther(etherAmount); //weiAmount
	const currentAmount = await provider.getBalance(address);
	return [currentAmount.gte(minimumAmount), formatEther(currentAmount)];
}
