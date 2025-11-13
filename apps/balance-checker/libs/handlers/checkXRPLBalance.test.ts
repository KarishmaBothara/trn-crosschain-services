import { jest } from "@jest/globals";
import kv from "@vercel/kv";
import { Client } from "xrpl";

import { IAccount, IXrplTokens } from "../types";
import checkXRPLBalance from "./checkXRPLBalance";

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
jest.mock("xrpl");

describe("checkXRPLBalance", () => {
	const accounts: IAccount[] = [
		{
			alias: "Alice",
			address: "r123abc",
			tokenThresholds: {
				XRP: 100,
			},
		},
	];
	const tokens: IXrplTokens = {
		XRP: {},
	};
	const isMainnet = false;
	const chain = "xrpl";
	const network = "testnet";

	const mockedDel = jest.mocked(kv.del);
	const mockedHset = jest.mocked(kv.hset);

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should check XRPL connection and set values to KV store if balance is low", async () => {
		const expectedBalance = [{"currency": "XRP", "value": "1.23"}];
		// mock the read-only property "getXrpBalance" from Client class
		Object.defineProperty(Client.prototype, "getBalances", {
			value: jest.fn(() => expectedBalance),
			configurable: true,
			writable: true,
		});

		await checkXRPLBalance(isMainnet, network, accounts, tokens);

		const instance = (Client as unknown as jest.Mocked<typeof Client>).mock
			.instances[0];

		// Verify that it has connect to and disconnected from the XRPL testnet
		expect(Client).toHaveBeenCalled();
		expect(instance.connect).toHaveBeenCalled();
		expect(instance.disconnect).toHaveBeenCalled();

		// Verify that the balances were computed correctly
		expect(instance.getBalances).toHaveBeenCalledWith(accounts[0].address);
		expect(instance.getBalances.mock.results[0].value).toBe(expectedBalance);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).toHaveBeenCalledWith(`${chain}:${network}`, {
			r123abc: {
				account: { address: "r123abc", alias: "Alice" },
				balances: [
					{ formattedBalance: "1.23", isLowBalance: true, token: "XRP" },
				],
				chain,
				isMainnet: false,
				network,
			},
		});
	});

	it("should not set values to KV store when balances are above the threshold", async () => {
		const expectedBalance = [{"currency": "XRP", "value": "123"}];
		// mock the read-only property "getXrpBalance" from Client class
		Object.defineProperty(Client.prototype, "getBalances", {
			value: jest.fn(() => expectedBalance),
			configurable: true,
			writable: true,
		});

		await checkXRPLBalance(isMainnet, network, accounts, tokens);

		const instance = (Client as unknown as jest.Mocked<typeof Client>).mock
			.instances[0];

		// Verify that it has connect to and disconnected from the XRPL testnet
		expect(Client).toHaveBeenCalled();
		expect(instance.connect).toHaveBeenCalled();
		expect(instance.disconnect).toHaveBeenCalled();

		// Verify that the balances were computed correctly
		expect(instance.getBalances).toHaveBeenCalledWith(accounts[0].address);
		expect(instance.getBalances.mock.results[0].value).toBe(expectedBalance);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).not.toHaveBeenCalled();
	});

	it("should set error/s to KV store when an unexpected error occurs during getXrpBalance", async () => {
		// mock the read-only property "getXrpBalance" from Client class
		Object.defineProperty(Client.prototype, "getBalances", {
			value: jest.fn().mockImplementation(() => {
				throw new Error("Failed to get balance");
			}),
			configurable: true,
			writable: true,
		});

		await checkXRPLBalance(isMainnet, network, accounts, tokens);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).toHaveBeenCalledTimes(1);
		expect(mockedHset).toHaveBeenCalledWith(`error:${chain}:${network}`, {
			"getbalances:r123abc": {
				message: `Error on '${chain}:${network}:getbalances':\n\nFailed to get balance`,
				chain,
				isMainnet,
			},
		});
	});

	it("should set error/s to KV store when an unexpected error occurs during kvSetLowBalances", async () => {
		const expectedBalance = [{"currency": "XRP", "value": "1.23"}];
		// mock the read-only property "getXrpBalance" from Client class
		Object.defineProperty(Client.prototype, "getBalances", {
			value: jest.fn(() => expectedBalance),
			configurable: true,
			writable: true,
		});

		mockedHset.mockImplementationOnce(() => {
			throw new Error("Failed to call hset");
		});

		await checkXRPLBalance(isMainnet, network, accounts, tokens);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).toHaveBeenCalledTimes(2);
		expect(mockedHset).toHaveBeenNthCalledWith(1, `${chain}:${network}`, {
			r123abc: {
				account: { address: "r123abc", alias: "Alice" },
				balances: [
					{ formattedBalance: "1.23", isLowBalance: true, token: "XRP" },
				],
				chain,
				isMainnet: false,
				network,
			},
		});
		expect(mockedHset).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`, {
			"setlowbalances:r123abc": {
				message: `Error on '${chain}:${network}:setlowbalances':\n\nFailed to call hset`,
				chain,
				isMainnet,
			},
		});
	});

	it("should set error/s to KV store when an unexpected error occurs during kvSetLowBalances for non xrp currency", async () => {
		const expectedBalance = [
			{ currency: 'XRP', value: '863.186604' },
			{
				value: '15',
				currency: 'LMN',
				issuer: 'rwwAVW9X7d4DCddkV9L15Mhh8jBmbvV3U5'
			},
			{
				value: '500',
				currency: 'ZRP',
				issuer: 'rwwAVW9X7d4DCddkV9L15Mhh8jBmbvV3U5'
			},
			{
				value: '5',
				currency: 'ZRP',
				issuer: 'rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA'
			},
		];
		// mock the read-only property "getXrpBalance" from Client class
		Object.defineProperty(Client.prototype, "getBalances", {
			value: jest.fn(() => expectedBalance),
			configurable: true,
			writable: true,
		});

		mockedHset.mockImplementationOnce(() => {
			throw new Error("Failed to call hset");
		});
		const newAccounts: IAccount[] = [
			{
				alias: "Alice",
				address: "r123abc",
				tokenThresholds: {
					XRP: 100,
					ZRP: { value: 100, issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA" }
				},
			},
		];

		const tokensAll: IXrplTokens = {
			XRP: {},
			ZRP: {},
			"524F4F5400000000000000000000000000000000": {}
		};
		await checkXRPLBalance(isMainnet, network, newAccounts, tokensAll);

		expect(mockedDel).toHaveBeenCalledTimes(2);
		expect(mockedDel).toHaveBeenNthCalledWith(1, `${chain}:${network}`);
		expect(mockedDel).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`);

		expect(mockedHset).toHaveBeenCalledTimes(2);
		expect(mockedHset).toHaveBeenNthCalledWith(1, `${chain}:${network}`, {
			r123abc: {
				account: { address: "r123abc", alias: "Alice" },
				balances: [
					{ formattedBalance: "5", isLowBalance: true, token: "ZRP" }
				],
				chain,
				isMainnet: false,
				network,
			},
		});
		expect(mockedHset).toHaveBeenNthCalledWith(2, `error:${chain}:${network}`, {
			"setlowbalances:r123abc": {
				message: `Error on '${chain}:${network}:setlowbalances':\n\nFailed to call hset`,
				chain,
				isMainnet,
			},
		});
	});

	it("should set error/s to KV store when an unexpected error occurs", async () => {
		// mock the Client.connect method to intentionally fail
		jest.spyOn(Client.prototype, "connect").mockImplementation(() => {
			throw new Error("Failed to connect");
		});

		await checkXRPLBalance(isMainnet, network, accounts, tokens);

		expect(mockedDel).toHaveBeenCalledTimes(0);

		expect(mockedHset).toHaveBeenCalledTimes(1);
		expect(mockedHset).toHaveBeenCalledWith(`error:${chain}:${network}`, {
			catchallerrors: {
				message: `Error on '${chain}:${network}:catchallerrors':\n\nFailed to connect`,
				chain,
				isMainnet,
			},
		});
	});
});
