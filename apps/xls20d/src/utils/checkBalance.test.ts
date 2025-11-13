import { describe, expect, it, jest } from "@jest/globals";
import { AssertionError } from "assert";
import { Wallet } from "xrpl";

import { checkXrpBalance } from "@trncs/xls20d/utils/checkBalance";

jest.mock("./__mocks__/AutoFill");

const seed = "sEd79YyYEnK4Q5WTQ6WMVTZRpA68njF";

describe("Check balance test", () => {
	it(`when balance is less than required
		`, async () => {
		const mockClient = {
			request: jest.fn(() => {
				return {
					result: {
						account_data: {
							Balance: 100,
						},
					},
				};
			}),
		};
		const wallet = Wallet.fromSeed(seed);
		await checkXrpBalance(wallet, mockClient as any, 100).catch((error) => {
			expect(error).toBeInstanceOf(AssertionError);
			expect(error).toHaveProperty(
				"message",
				`Dont have enough xrp balance on xrpl chain for address ${wallet.address}`
			);
		});
	});

	it(`when balance is sufficient
		`, async () => {
		const mockClient = {
			request: jest.fn(() => {
				return {
					result: {
						account_data: {
							Balance: 1000000,
						},
					},
				};
			}),
		};
		const wallet = Wallet.fromSeed(seed);
		await checkXrpBalance(wallet, mockClient as any, 100);
	});
});
