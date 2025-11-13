import { jest } from "@jest/globals";
import kv from "@vercel/kv";
import { ethers } from "ethers";

import { IAccount, IRootTokens } from "../types";
import checkROOTBalance from "./checkROOTBalance";

// Mock the dependencies of the function
jest.mock("@vercel/kv", () => {
	const originalModule = jest.requireActual("@vercel/kv") as typeof kv;
	return {
		...originalModule,
		hset: jest.fn(() => Promise.resolve(1)),
		del: jest.fn(() => Promise.resolve(1)),
		default: () => {
			return {
				...originalModule,
			};
		},
	};
});
jest.mock("ethers", () => {
	const originalModule = jest.requireActual("ethers") as typeof ethers;
	return {
		ethers: {
			...originalModule,
			Contract: jest.fn(() => ({
				balanceOf: jest.fn(() => Promise.resolve(2000000000000000000000n)), // 2000.0 ASTO
			})),
			JsonRpcProvider: jest.fn(() => ({
				getBalance: jest.fn(() => Promise.resolve(1000000000000000000000n)), // 1000.0 XRP
			})),
		},
	};
});

describe("checkROOTBalance", () => {
	const tokens: IRootTokens = {
		XRP: {
			assetId: 2,
			decimals: 6,
		},
		ROOT: {
			assetId: 1,
			decimals: 6,
		},
		ASTO: {
			assetId: 17508,
			decimals: 18,
		},
		SYLO: {
			assetId: 3172,
			decimals: 18,
		},
		ETH: {
			assetId: 1124,
			decimals: 18,
		},
	};
	const isMainnet = false;
	const chain = "trn";
	const network = "porcini";

	const mockedDel = jest.mocked(kv.del);
	const mockedHset = jest.mocked(kv.hset);

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should set values to KV store when a low balance is detected", async () => {
		const accounts: IAccount[] = [
			{
				alias: "Alice",
				address: "0x123abc",
				tokenThresholds: {
					ASTO: 10000,
					XRP: 15000,
				},
			},
		];

		await checkROOTBalance(isMainnet, network, accounts, tokens);

		// Verify that the ethers JsonRpcProvider was called
		expect(ethers.JsonRpcProvider).toHaveBeenCalled();

		/* eslint-disable @typescript-eslint/no-explicit-any */
		const JsonRpcProviderInstance = (
			ethers.JsonRpcProvider as unknown as jest.Mocked<
				typeof ethers.JsonRpcProvider
			>
		).mock.results[0].value as any;
		/* eslint-enable @typescript-eslint/no-explicit-any */

		// Verify that the balances were computed correctly
		expect(JsonRpcProviderInstance.getBalance).toHaveBeenCalledWith(
			accounts[0].address
		);
		const getBalanceResult = (await JsonRpcProviderInstance.getBalance.mock
			.results[0].value) as bigint;
		expect(ethers.formatEther(getBalanceResult)).toBe("1000.0");

		/* eslint-disable @typescript-eslint/no-explicit-any */
		const ContractInstance = (
			ethers.Contract as unknown as jest.Mocked<typeof ethers.Contract>
		).mock.results[0].value as any;
		/* eslint-enable @typescript-eslint/no-explicit-any */

		const balanceOfResult = (await ContractInstance.balanceOf.mock.results[0]
			.value) as bigint;
		expect(ethers.formatEther(balanceOfResult)).toBe("2000.0");

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).toHaveBeenCalledTimes(1);
		expect(mockedHset).toHaveBeenCalledWith(`${chain}:${network}`, {
			"0x123abc": {
				account: { address: "0x123abc", alias: "Alice" },
				balances: [
					{ formattedBalance: "1000.0", isLowBalance: true, token: "XRP" },
					{ formattedBalance: "2000.0", isLowBalance: true, token: "ASTO" },
				],
				chain,
				isMainnet,
				network,
			},
		});
	});

	it("should not set values to KV store when balances are above the threshold", async () => {
		const accounts: IAccount[] = [
			{
				alias: "Alice",
				address: "0x123abc",
				tokenThresholds: {
					ASTO: 1000,
					XRP: 500,
				},
			},
		];

		await checkROOTBalance(isMainnet, network, accounts, tokens);

		// Verify that the ethers JsonRpcProvider was called
		expect(ethers.JsonRpcProvider).toHaveBeenCalled();

		/* eslint-disable @typescript-eslint/no-explicit-any */
		const JsonRpcProviderInstance = (
			ethers.JsonRpcProvider as unknown as jest.Mocked<
				typeof ethers.JsonRpcProvider
			>
		).mock.results[0].value as any;
		/* eslint-enable @typescript-eslint/no-explicit-any */

		// Verify that the balances were computed correctly
		expect(JsonRpcProviderInstance.getBalance).toHaveBeenCalledWith(
			accounts[0].address
		);
		const getBalanceResult = (await JsonRpcProviderInstance.getBalance.mock
			.results[0].value) as bigint;
		expect(ethers.formatEther(getBalanceResult)).toBe("1000.0");

		/* eslint-disable @typescript-eslint/no-explicit-any */
		const ContractInstance = (
			ethers.Contract as unknown as jest.Mocked<typeof ethers.Contract>
		).mock.results[0].value as any;
		/* eslint-enable @typescript-eslint/no-explicit-any */

		const balanceOfResult = (await ContractInstance.balanceOf.mock.results[0]
			.value) as bigint;
		expect(ethers.formatEther(balanceOfResult)).toBe("2000.0");

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).not.toHaveBeenCalled();
	});

	it("should set error/s to KV store when an unexpected error occurs during getBalance", async () => {
		const accounts: IAccount[] = [
			{
				alias: "Alice",
				address: "0x123abc",
				tokenThresholds: {
					ASTO: 1000,
					XRP: 500,
				},
			},
		];
		// Mock the JsonRpcProvider to throw an error
		const mockJsonRpcProvider = {
			getBalance: jest.fn().mockImplementationOnce(() => {
				throw new Error("Failed to get balance");
			}),
		};
		(ethers.JsonRpcProvider as jest.Mock).mockReturnValueOnce(
			mockJsonRpcProvider
		);

		await checkROOTBalance(isMainnet, network, accounts, tokens);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).toHaveBeenCalledTimes(1);
		expect(mockedHset).toHaveBeenCalledWith(`error:${chain}:${network}`, {
			"getbalances:0x123abc": {
				message: `Error on '${chain}:${network}:getbalances':\n\nFailed to get balance`,
				chain,
				isMainnet,
			},
		});
	});

	it("should set error/s to KV store when an unexpected error occurs during get contract balance", async () => {
		const accounts: IAccount[] = [
			{
				alias: "Alice",
				address: "0x123abc",
				tokenThresholds: {
					ASTO: 1000,
					XRP: 500,
				},
			},
		];
		// Mock the getEthersProvider to throw an error
		const mockContract = {
			balanceOf: jest.fn().mockImplementationOnce(() => {
				throw new Error("Failed to get contract balance");
			}),
		};
		(ethers.Contract as jest.Mock).mockReturnValueOnce(mockContract);

		await checkROOTBalance(isMainnet, network, accounts, tokens);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).toHaveBeenCalledTimes(1);
		expect(mockedHset).toHaveBeenCalledWith(`error:${chain}:${network}`, {
			"getbalances:0x123abc": {
				message: `Error on '${chain}:${network}:getbalances':\n\nFailed to get contract balance`,
				chain,
				isMainnet,
			},
		});
	});

	it("should set error/s to KV store when an unexpected error occurs during kvSetLowBalances", async () => {
		const accounts: IAccount[] = [
			{
				alias: "Alice",
				address: "0x123abc",
				tokenThresholds: {
					XRP: 15000,
				},
			},
		];

		mockedHset.mockImplementationOnce(() => {
			throw new Error("Failed to call hset");
		});

		await checkROOTBalance(isMainnet, network, accounts, tokens);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).toHaveBeenCalledTimes(2);
		expect(mockedHset).toHaveBeenNthCalledWith(1, "trn:porcini", {
			"0x123abc": {
				account: { address: "0x123abc", alias: "Alice" },
				balances: [
					{ formattedBalance: "1000.0", isLowBalance: true, token: "XRP" },
				],
				chain,
				isMainnet,
				network,
			},
		});
		expect(mockedHset).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`, {
			"setlowbalances:0x123abc": {
				message: `Error on '${chain}:${network}:setlowbalances':\n\nFailed to call hset`,
				chain,
				isMainnet,
			},
		});
	});

	it("should set error/s to KV store when an unexpected error occurs", async () => {
		const accounts: IAccount[] = [
			{
				alias: "Alice",
				address: "0x123abc",
				tokenThresholds: {
					ASTO: 1000,
					XRP: 500,
				},
			},
		];
		// Mock the ethers.JsonRpcProvider to throw an error
		(ethers.JsonRpcProvider as jest.Mock).mockImplementationOnce(() => {
			throw new Error("Failed to get provider");
		});

		await checkROOTBalance(isMainnet, network, accounts, tokens);

		expect(mockedDel).toHaveBeenCalledTimes(0);

		expect(mockedHset).toHaveBeenCalledTimes(1);
		expect(mockedHset).toHaveBeenCalledWith(`error:${chain}:${network}`, {
			catchallerrors: {
				message: `Error on '${chain}:${network}:catchallerrors':\n\nFailed to get provider`,
				chain,
				isMainnet,
			},
		});
	});
});
