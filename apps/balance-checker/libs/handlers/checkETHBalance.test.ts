import { jest } from "@jest/globals";
import kv from "@vercel/kv";
import { ethers } from "ethers";

import { IAccount, IEthTokens } from "../types";
import getEthersProvider from "../utils/getEthersProvider";
import checkETHBalance from "./checkETHBalance";

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
jest.mock("../utils/getEthersProvider");

describe("checkETHBalance", () => {
	const accounts: IAccount[] = [
		{
			alias: "Alice",
			address: "0x123abc",
			tokenThresholds: {
				ETH: 10,
			},
		},
	];
	const tokens: IEthTokens = {
		ETH: {},
	};
	const isMainnet = false;
	const chain = "ethereum";
	const network = "goerli";

	const mockedDel = jest.mocked(kv.del);
	const mockedHset = jest.mocked(kv.hset);

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should set values to KV store when a low balance is detected", async () => {
		const expectedBalance = "5.0";
		const provider = {
			getBalance: jest
				.fn()
				.mockImplementation(() => ethers.parseEther(expectedBalance)),
		};
		(getEthersProvider as jest.Mock).mockReturnValue(provider);

		await checkETHBalance(isMainnet, network, accounts, tokens);

		// Verify that the ethers provider was called
		expect(getEthersProvider).toHaveBeenCalledWith(network);

		// Verify that the balances were computed correctly
		expect(provider.getBalance).toHaveBeenCalledWith(accounts[0].address);
		expect(
			ethers.formatEther(provider.getBalance.mock.results[0].value as bigint)
		).toBe(expectedBalance);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).toHaveBeenCalledTimes(1);
		expect(mockedHset).toHaveBeenCalledWith(`${chain}:${network}`, {
			"0x123abc": {
				account: { address: "0x123abc", alias: "Alice" },
				balances: [
					{ formattedBalance: "5.0", isLowBalance: true, token: "ETH" },
				],
				chain,
				isMainnet,
				network,
			},
		});
	});

	it("should not set values to KV store when balances are above the threshold", async () => {
		const expectedBalance = "15.0";
		const provider = {
			getBalance: jest
				.fn()
				.mockImplementation(() => ethers.parseEther(expectedBalance)),
		};
		(getEthersProvider as jest.Mock).mockReturnValue(provider);

		await checkETHBalance(isMainnet, network, accounts, tokens);

		// Verify that the ethers provider was called
		expect(getEthersProvider).toHaveBeenCalledWith(network);

		// Verify that the balances were computed correctly
		expect(provider.getBalance).toHaveBeenCalledWith(accounts[0].address);
		expect(
			ethers.formatEther(provider.getBalance.mock.results[0].value as bigint)
		).toBe(expectedBalance);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).not.toHaveBeenCalled();
	});

	it("should set error/s to KV store when an unexpected error occurs during getBalance", async () => {
		// Mock the getEthersProvider to throw an error
		const provider = {
			getBalance: jest.fn().mockImplementation(() => {
				throw new Error("Failed to get balance");
			}),
		};
		(getEthersProvider as jest.Mock).mockReturnValue(provider);

		await checkETHBalance(isMainnet, network, accounts, tokens);

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

	it("should set error/s to KV store when an unexpected error occurs during kvSetLowBalances", async () => {
		// Mock the getEthersProvider to throw an error
		const expectedBalance = "5.0";
		const provider = {
			getBalance: jest
				.fn()
				.mockImplementation(() => ethers.parseEther(expectedBalance)),
		};
		(getEthersProvider as jest.Mock).mockReturnValue(provider);

		mockedHset.mockImplementationOnce(() => {
			throw new Error("Failed to call hset");
		});

		await checkETHBalance(isMainnet, network, accounts, tokens);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).toHaveBeenCalledTimes(2);
		expect(mockedHset).toHaveBeenNthCalledWith(1, `${chain}:${network}`, {
			"0x123abc": {
				account: { address: "0x123abc", alias: "Alice" },
				balances: [
					{ formattedBalance: "5.0", isLowBalance: true, token: "ETH" },
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
		// Mock the getEthersProvider to throw an error
		(getEthersProvider as jest.Mock).mockImplementationOnce(() => {
			throw new Error("Failed to get provider");
		});

		await checkETHBalance(isMainnet, network, accounts, tokens);

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
