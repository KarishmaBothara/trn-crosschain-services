import { Provider } from "@ethersproject/abstract-provider";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BigNumber } from "ethers";

import { checkEthBalance } from "./checkEthBalance";

const provider = {
	getBalance: jest.fn((accountId: string) => {
		if (accountId === "none-test")
			return {
				isNone: true,
			};

		if (accountId === "low-test") return BigNumber.from("10");
		if (accountId === "high-test") return BigNumber.from("1000000000000000000");
	}),
} as unknown as Provider;

describe("checkEthBalance", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should...
			- return [true, amount] if fetched amount is greater than minimum 1 ETH
	`, async () => {
		const [passed, amount] = await checkEthBalance(provider, "high-test");

		expect(passed).toBe(true);
		expect(amount.toString()).toBe("1.0");
	});

	it(`should...
			- return false if fetched amount is greater than minimum 1 ETH
	`, async () => {
		const [passed, amount] = await checkEthBalance(provider, "low-test");

		expect(passed).toBe(false);
		expect(amount.toString()).toBe("0.00000000000000001");
	});
});
