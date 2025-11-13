import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Wallet } from "ethers";

import { createRelayerWallet } from "./createRelayerWallet";
import { getEthersProvider } from "./getEthersProvider";

let $outboxRelayerSeed: string | void = "";
const sampleValue = "Sample Value";

jest.mock("@trncs/ebd/config", () => {
	return {
		__esModule: true,
		get outboxRelayerSeed() {
			return $outboxRelayerSeed;
		},
	};
});

jest.mock("./getEthersProvider", () => {
	return {
		__esModule: true,
		getEthersProvider: jest.fn(() => sampleValue),
	};
});

jest.mock("ethers", () => {
	return {
		__esModule: true,
		Wallet: jest.fn(),
	};
});

describe("createRelayerWallet", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should...
			- creates a \`Wallet\` instance...
				- with correct \`seed\` value from \`@/config\`
				- with a value from \`getEthersProvider()\`
	`, async () => {
		$outboxRelayerSeed =
			"0x0000000000000000000000000000000000000000000000000000000000000000";
		const result = createRelayerWallet();

		const $getEthersProvider = jest.mocked(getEthersProvider);
		const $Wallet = jest.mocked(Wallet);

		expect($getEthersProvider).toBeCalled();
		expect(result).toBeInstanceOf(Wallet);

		expect($getEthersProvider.mock.results[0].value).toEqual(sampleValue);
		expect($Wallet.mock.calls[0]).toEqual([$outboxRelayerSeed, sampleValue]);
	});
});
