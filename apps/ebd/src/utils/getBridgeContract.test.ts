import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Contract, utils as ethers, getDefaultProvider, Wallet } from "ethers";

import Bridge from "@trncs/ebd/abi/Bridge.json";

import { createRelayerWallet } from "./createRelayerWallet";
import { getBridgeContract } from "./getBridgeContract";
import { getEthersProvider } from "./getEthersProvider";

const $bridgeContractAddress = "0xc48cc24cd6A119bDF677876e06D2E3a1946FEB1d";
const $outboxRelayerSeed =
	"0x56938bc2fd0275837087fcb26b00f7e316690f1e54c8b45e9e723cca48e4db7b";

jest.mock("@trncs/ebd/config", () => {
	return {
		__esModule: true,
		get bridgeContractAddress() {
			return $bridgeContractAddress;
		},
		get outboxRelayerSeed() {
			return $outboxRelayerSeed;
		},
	};
});

jest.mock("./getEthersProvider", () => {
	return {
		__esModule: true,
		getEthersProvider: jest.fn(getDefaultProvider),
	};
});

describe("getBridgeContract", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should...
			- creates an \`ethers.Contract\` instance...
				- with contract address from \`@/config\`
				- with abi from \`Bridge.json\`
				- with wallet instance from \`createRelayerWallet\`
		`, () => {
		const contract = getBridgeContract();

		expect(contract).toBeInstanceOf(Contract);
		expect(contract.address).toBe($bridgeContractAddress);

		const iface = new ethers.Interface(Bridge.abi);
		expect(contract.interface.format()).toEqual(iface.format());

		expect(contract.signer).toBeInstanceOf(Wallet);
		expect(JSON.stringify(contract.signer)).toEqual(
			JSON.stringify(createRelayerWallet())
		);
	});

	it(`should...
			- create a single \`ethers.Contract\` instance no matter how many calls
		`, () => {
		const contract = getBridgeContract();

		const $getEthersProvider = jest.mocked(getEthersProvider);

		const atLeastTwo = Math.max(2, Math.ceil(Math.random() * 10));
		for (let i = 0; i < atLeastTwo; i++) {
			getBridgeContract();
		}

		expect(contract).toBeInstanceOf(Contract);

		// The contract instance was created in the previous test,
		// so after clearing all mocks we can expect 0 calls
		expect($getEthersProvider).toBeCalledTimes(0);
	});
});
