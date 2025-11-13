import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { getDefaultProvider } from "ethers";

import { getEthersProvider } from "./getEthersProvider";

let $ethNetwork: string | void = "";
let $alchemyApiToken: string | void = "";
let $infuraApiToken:
	| { projectId: string; projectSecret: string }
	| string
	| void = "";

jest.mock("@trncs/ebd/config", () => {
	return {
		__esModule: true,
		get ethNetwork() {
			return $ethNetwork;
		},
		get alchemyApiToken() {
			return $alchemyApiToken;
		},
		get infuraApiToken() {
			return $infuraApiToken;
		},
	};
});

jest.mock("@ethersproject/providers", () => {
	return {
		__esModule: true,
		AlchemyProvider: jest.fn(),
		InfuraProvider: jest.fn(),
	};
});

jest.mock("ethers", () => {
	return {
		__esModule: true,
		getDefaultProvider: jest.fn(),
	};
});

describe("getEthersProvider", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should...
			- call \`ethers/getDefaultProvider\` with correct values
	`, () => {
		$ethNetwork = "sepolia";
		$infuraApiToken = "INFURA123ABC";
		$alchemyApiToken = "ALCHEMY123ABC";

		getEthersProvider();
		const $getDefaultProvider = jest.mocked(getDefaultProvider);

		expect($getDefaultProvider).toBeCalled();
		expect($getDefaultProvider.mock.calls[0]).toEqual([
			$ethNetwork,
			{
				infura: $infuraApiToken,
				alchemy: $alchemyApiToken,
				etherscan: "-",
				pocket: "-",
				ankr: "-",
				cloudflare: "-",
				quorum: 1,
			},
		]);
	});

	it(`should...
			- call \`ethers/getDefaultProvider\` with correct values
	`, () => {
		$ethNetwork = "homestead";
		$infuraApiToken = "INFURA123ABC";
		$alchemyApiToken = "ALCHEMY123ABC";

		getEthersProvider();
		const $getDefaultProvider = jest.mocked(getDefaultProvider);

		expect($getDefaultProvider).toBeCalled();
		expect($getDefaultProvider.mock.calls[0]).toEqual([
			$ethNetwork,
			{
				infura: $infuraApiToken,
				alchemy: $alchemyApiToken,
				etherscan: "-",
				pocket: "-",
				ankr: "-",
				cloudflare: "-",
				quorum: 2,
			},
		]);
	});
});
