import { Contract } from "ethers";

import Bridge from "@trncs/ebd/abi/Bridge.json";
import { bridgeContractAddress } from "@trncs/ebd/config";

import { createRelayerWallet } from "./createRelayerWallet";

let contract: Contract;

export function getBridgeContract(): Contract {
	if (contract) return contract;
	const wallet = createRelayerWallet();
	return (contract = new Contract(bridgeContractAddress, Bridge.abi, wallet));
}

export async function readBridgeContract<T>(value: string): Promise<T> {
	const bridge = getBridgeContract();
	return (await bridge[value]()) as T;
}
