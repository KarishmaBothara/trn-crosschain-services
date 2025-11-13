import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BigNumber } from "ethers";
import { Client, xrpToDrops } from "xrpl";

import { checkXRPFeeBalance } from "@trncs/utils/checkXRPFeeBalance";

//accountInfo.result
jest.mock("xrpl", () => {
	return {
		__esModule: true,
		xrpToDrops: jest.fn((value: number) => {
			return (value * 1_000_000).toString();
		}),
	};
});
//result.account_data.Balance
const mockBalance = (balance: string) => {
	return {
		result: {
			account_data: {
				Balance: BigNumber.from(balance),
			},
		},
	};
};

const xrpClient = {
	request: jest.fn((params: any) => {
		const accountId = params?.account;
		if (accountId === "none-test")
			return {
				isNone: true,
			};

		if (accountId === "low-test") return mockBalance("10");
		if (accountId === "high-test") return mockBalance("500000000");
	}),
} as unknown as Client;

describe("checkXRPFeeBalance", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should...
			- converts \`minimum\` value to drops
			- return [true, amount] if fetched amount is greater than minimum 100 xrp
	`, async () => {
		const [passed, amount] = await checkXRPFeeBalance(xrpClient, "high-test");
		const $xrpToDrops = jest.mocked<typeof xrpToDrops>(xrpToDrops);

		expect($xrpToDrops).toHaveBeenCalledTimes(1);
		// expect($xrpToDrops.mock.calls[0][0]).toBe(10);

		expect(passed).toBe(true);
		expect(amount.toString()).toBe("500.0");
	});

	it(`should...
			- return false if fetched amount is greater than minimum
	`, async () => {
		const [passed, amount] = await checkXRPFeeBalance(xrpClient, "low-test");
		const $xrpToDrops = jest.mocked<typeof xrpToDrops>(xrpToDrops);

		expect($xrpToDrops).toHaveBeenCalledTimes(1);

		expect(passed).toBe(false);
		expect(amount.toString()).toBe("0.00001");
	});
});
