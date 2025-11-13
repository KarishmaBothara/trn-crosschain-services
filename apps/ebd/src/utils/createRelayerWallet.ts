import { Wallet } from "ethers";

import { outboxRelayerSeed } from "@trncs/ebd/config";

import { getEthersProvider } from "./getEthersProvider";

export function createRelayerWallet(): Wallet {
	const ethersProvider = getEthersProvider();
	return new Wallet(outboxRelayerSeed!, ethersProvider);
}
