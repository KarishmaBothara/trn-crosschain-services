import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BigNumber } from "ethers";

import { callBridgeContract } from "./callBridgeContract";

const $gasMultiplier = 1.5;
const $bridgeFee = BigNumber.from(100);
const $gasEstimate = BigNumber.from(10);

jest.mock("@trncs/ebd/config", () => {
	return {
		__esModule: true,
		get gasMultiplier() {
			return $gasMultiplier;
		},
	};
});

const MockBridgeContract = {
	mockCall: jest.fn(),
	bridgeFee: () => Promise.resolve($bridgeFee),
	signer: {
		getAddress: () => "0x5D5586341ca72146791C33c26c0c10eD971c9B53",
	},
	estimateGas: {
		mockCall: jest.fn(() => Promise.resolve($gasEstimate)),
	},
};

jest.mock("./getBridgeContract", () => {
	return {
		__esModule: true,
		getBridgeContract: jest.fn(() => MockBridgeContract),
	};
});

jest.mock("@trncs/utils/checkEthBalance", () => {
	return {
		__esModule: true,
		checkEthBalance: jest.fn(() => [true, 11]),
	};
});

describe("callBridgeContract", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should...
			- gets a Contract instance from \`getBridgeContract\`
			- can call a function on the contract...
				- with \`value\` is \`null\`
				- with correct \`gasLimit\` value
	`, async () => {
		const arg1 = "one";
		const arg2 = 2;

		await callBridgeContract("mockCall", [arg1, arg2]);

		expect(MockBridgeContract.mockCall).toHaveBeenCalledTimes(1);
		expect(MockBridgeContract.estimateGas.mockCall).toHaveBeenCalledTimes(1);

		expect(MockBridgeContract.mockCall).toHaveBeenCalledWith(arg1, arg2, {
			value: null,
			gasLimit: ($gasEstimate.toNumber() * $gasMultiplier).toFixed(),
		});
	});

	it(`should...
			- gets a Contract instance from \`getBridgeContract\`
			- can call a function on the contract...
				- with \`value\` is the value of \`bridgeFee()\`
				- with correct \`gasLimit\` value
	`, async () => {
		const arg1 = 1;
		const arg2 = "two";

		await callBridgeContract("mockCall", [arg1, arg2], true);

		expect(MockBridgeContract.mockCall).toHaveBeenCalledTimes(1);
		expect(MockBridgeContract.estimateGas.mockCall).toHaveBeenCalledTimes(1);

		expect(MockBridgeContract.mockCall).toHaveBeenCalledWith(arg1, arg2, {
			value: $bridgeFee,
			gasLimit: ($gasEstimate.toNumber() * $gasMultiplier).toFixed(),
		});
	});
});
