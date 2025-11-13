import { jest } from "@jest/globals";
import kv from "@vercel/kv";

import { LoggerChannel, LoggerChild } from "@trncs/balance-checker/libs/utils";

import SlackLogger from "../utils/SlackLogger";
import sendLowBalances from "./sendLowBalances";

// Mock the dependencies of the function
jest.mock("@vercel/kv", () => {
	const originalModule = jest.requireActual("@vercel/kv") as typeof kv;
	return {
		...originalModule,
		hgetall: jest.fn(),
		default: () => {
			return {
				...originalModule,
			};
		},
	};
});
jest.mock("../utils/SlackLogger");

describe("sendLowBalances", () => {
	const goerliResolvedValue = {
		"0x123abc": {
			chain: "ethereum",
			balances: [
				{
					token: "ETH",
					formattedBalance: "0.123",
					isLowBalance: true,
				},
			],
			isMainnet: false,
			network: "goerli",
			account: {
				alias: "Alice",
				address: "0x123abc",
			},
		},
	};
	const homesteadResolvedValue = {
		"0x456def": {
			chain: "ethereum",
			balances: [
				{
					token: "ETH",
					formattedBalance: "0.456",
					isLowBalance: true,
				},
			],
			isMainnet: true,
			network: "homestead",
			account: {
				alias: "Bob",
				address: "0x456def",
			},
		},
	};
	const porciniResolvedValue = {
		"0xabc123": {
			chain: "trn",
			balances: [
				{
					token: "ROOT",
					formattedBalance: "100",
					isLowBalance: true,
				},
				{
					token: "XRP",
					formattedBalance: "1000",
					isLowBalance: true,
				},
			],
			isMainnet: false,
			network: "porcini",
			account: {
				alias: "root1",
				address: "0xabc123",
			},
		},
	};
	const mainnetResolvedValue = {
		"0xdef456": {
			chain: "trn",
			balances: [
				{
					token: "XRP",
					formattedBalance: "1000",
					isLowBalance: true,
				},
			],
			isMainnet: true,
			network: "mainnet",
			account: {
				alias: "root2",
				address: "0xdef456",
			},
		},
	};
	const testnetResolvedValue = {
		r123456: {
			chain: "xrpl",
			balances: [
				{
					token: "XRP",
					formattedBalance: "1000",
					isLowBalance: true,
				},
			],
			isMainnet: false,
			network: "testnet",
			account: {
				alias: "xrpl1",
				address: "r123456",
			},
		},
	};
	const livenetResolvedValue = {
		r456789: {
			chain: "xrpl",
			balances: [
				{
					token: "XRP",
					formattedBalance: "2000",
					isLowBalance: true,
				},
			],
			isMainnet: true,
			network: "livenet",
			account: {
				alias: "xrpl2",
				address: "r456789",
			},
		},
	};

	beforeEach(() => {
		console.warn = jest.fn();
		console.error = jest.fn();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const mockedHgetall = jest.mocked(kv.hgetall);
	const mockedSlackLogger = jest.mocked(SlackLogger);

	it("should not send notification/s when no low balances to process", async () => {
		// Mock the KV hgetall function
		mockedHgetall.mockResolvedValue(null);

		const slackWarnSpy = jest.spyOn(SlackLogger.prototype, "warn");
		const slackFatalSpy = jest.spyOn(SlackLogger.prototype, "fatal");

		await sendLowBalances();

		expect(mockedHgetall).toHaveBeenCalledTimes(6);
		expect(mockedHgetall).toHaveBeenNthCalledWith(1, "ethereum:goerli");
		expect(mockedHgetall).toHaveBeenNthCalledWith(2, "ethereum:homestead");
		expect(mockedHgetall).toHaveBeenNthCalledWith(3, "trn:porcini");
		expect(mockedHgetall).toHaveBeenNthCalledWith(4, "trn:mainnet");
		expect(mockedHgetall).toHaveBeenNthCalledWith(5, "xrpl:testnet");
		expect(mockedHgetall).toHaveBeenNthCalledWith(6, "xrpl:livenet");

		expect(console.warn).toHaveBeenCalledTimes(0);
		expect(console.error).toHaveBeenCalledTimes(0);
		expect(slackWarnSpy).toHaveBeenCalledTimes(0);
		expect(slackFatalSpy).toHaveBeenCalledTimes(0);
	});

	it("should send notification/s when there's low balances in all chains", async () => {
		// Mock the KV hgetall function
		mockedHgetall
			.mockResolvedValueOnce(goerliResolvedValue)
			.mockResolvedValueOnce(homesteadResolvedValue)
			.mockResolvedValueOnce(porciniResolvedValue)
			.mockResolvedValueOnce(mainnetResolvedValue)
			.mockResolvedValueOnce(testnetResolvedValue)
			.mockResolvedValueOnce(livenetResolvedValue);

		const slackWarnSpy = jest.spyOn(SlackLogger.prototype, "warn");
		const slackFatalSpy = jest.spyOn(SlackLogger.prototype, "fatal");

		await sendLowBalances();

		expect(mockedHgetall).toHaveBeenCalledTimes(6);

		expect(console.warn).toHaveBeenCalledTimes(6);
		expect(slackWarnSpy).toHaveBeenCalledTimes(6);

		expect(console.error).toHaveBeenCalledTimes(0);
		expect(slackFatalSpy).toHaveBeenCalledTimes(0);
	});

	it("should send notification/s when there's low balances in some chains", async () => {
		// Mock the KV hgetall function
		mockedHgetall
			.mockResolvedValueOnce(goerliResolvedValue)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(porciniResolvedValue)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(testnetResolvedValue)
			.mockResolvedValueOnce(null);

		const slackWarnSpy = jest.spyOn(SlackLogger.prototype, "warn");
		const slackFatalSpy = jest.spyOn(SlackLogger.prototype, "fatal");

		await sendLowBalances();

		expect(mockedHgetall).toHaveBeenCalledTimes(6);

		expect(console.warn).toHaveBeenCalledTimes(3);
		expect(slackWarnSpy).toHaveBeenCalledTimes(3);

		expect(console.error).toHaveBeenCalledTimes(0);
		expect(slackFatalSpy).toHaveBeenCalledTimes(0);
	});

	it("should send notification when an unexpected error occured", async () => {
		const expectedErrorMsg = "Failed to get all values from KV";
		mockedHgetall
			.mockResolvedValueOnce(goerliResolvedValue)
			.mockImplementationOnce(() => {
				throw new Error(expectedErrorMsg);
			})
			.mockResolvedValueOnce(porciniResolvedValue);

		const slackWarnSpy = jest.spyOn(SlackLogger.prototype, "warn");
		const slackFatalSpy = jest.spyOn(SlackLogger.prototype, "fatal");

		await sendLowBalances();

		expect(mockedHgetall).toHaveBeenCalledTimes(2);

		expect(console.warn).toHaveBeenCalledTimes(0);
		expect(slackWarnSpy).toHaveBeenCalledTimes(0);

		expect(console.error).toHaveBeenCalledTimes(1);
		expect(slackFatalSpy).toHaveBeenCalledTimes(1);

		expect(console.error).toHaveBeenCalledWith(new Error(expectedErrorMsg));
		expect(slackFatalSpy).toHaveBeenCalledWith(
			`Error on 'sendnotifications':\n\n${expectedErrorMsg}`
		);
	});

	it("should verify that the SlackLogger was instantiated 4x", async () => {
		await sendLowBalances();

		expect(SlackLogger).toHaveBeenCalledTimes(4);
		expect(mockedSlackLogger.mock.calls[0]).toEqual([
			"BALANCE_CHECKER",
			LoggerChannel.BalanceCheck,
			LoggerChild.Ethereum,
		]);
		expect(mockedSlackLogger.mock.calls[1]).toEqual([
			"BALANCE_CHECKER",
			LoggerChannel.BalanceCheck,
			LoggerChild.Root,
		]);
		expect(mockedSlackLogger.mock.calls[2]).toEqual([
			"BALANCE_CHECKER",
			LoggerChannel.BalanceCheck,
			LoggerChild.Xrpl,
		]);
		expect(mockedSlackLogger.mock.calls[3]).toEqual([
			"BALANCE_CHECKER",
			LoggerChannel.BalanceCheck,
			LoggerChild.Any,
		]);
	});

	it("should handle isProd parameter", async () => {
		await sendLowBalances();

		expect(mockedSlackLogger.mock.calls[3]).toEqual([
			"BALANCE_CHECKER",
			LoggerChannel.BalanceCheck,
			LoggerChild.Any,
			undefined,
		]);

		mockedSlackLogger.mockReset();

		await sendLowBalances(false);

		expect(mockedSlackLogger.mock.calls[3]).toEqual([
			"BALANCE_CHECKER",
			LoggerChannel.BalanceCheck,
			LoggerChild.Any,
			false,
		]);

		mockedSlackLogger.mockReset();

		await sendLowBalances(true);

		expect(mockedSlackLogger.mock.calls[3]).toEqual([
			"BALANCE_CHECKER",
			LoggerChannel.BalanceCheck,
			LoggerChild.Any,
			true,
		]);
	});
});
