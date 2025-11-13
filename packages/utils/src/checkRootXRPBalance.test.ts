import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ApiPromise } from "@polkadot/api";
import { xrpToDrops } from "xrpl";

import { checkRootXRPBalance } from "./checkRootXRPBalance";

jest.mock("xrpl", () => {
	return {
		__esModule: true,
		xrpToDrops: jest.fn((value: number) => {
			return (value * 1_000_000).toString();
		}),
	};
});

const mockBalance = (balance: string) => {
	return {
		unwrap: () => ({
			balance,
		}),
	};
};

const api = {
	query: {
		assets: {
			account: jest.fn((_assetId: number, accountId: string) => {
				if (accountId === "none-test")
					return {
						isNone: true,
					};

				if (accountId === "low-test") return mockBalance("10");
				if (accountId === "high-test") return mockBalance("500000000");
			}),
		},
	},
} as unknown as ApiPromise;

describe("checkXRPBalance", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should...
			- converts \`minimum\` value to drops
			- query \`assets.account\` with id \`2\`
			- return [true, amount] if fetched amount is greater than minimum
	`, async () => {
		const [passed, amount] = await checkRootXRPBalance(api, "high-test");
		const $xrpToDrops = jest.mocked<typeof xrpToDrops>(xrpToDrops);

		expect($xrpToDrops).toHaveBeenCalledTimes(1);
		expect(passed).toBe(true);
		expect(amount).toBe("500.0");
	});

	it(`should...
			- return false if fetched amount is greater than minimum
	`, async () => {
		const [passed, amount] = await checkRootXRPBalance(api, "low-test");
		const $xrpToDrops = jest.mocked<typeof xrpToDrops>(xrpToDrops);

		expect($xrpToDrops).toHaveBeenCalledTimes(1);
		// expect($xrpToDrops.mock.calls[0][0]).toBe(10);

		expect(passed).toBe(false);
		expect(amount.toString()).toBe("0.00001");
	});
});
