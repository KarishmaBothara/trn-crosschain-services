import { jest } from "@jest/globals";
import kv from "@vercel/kv";

import { LoggerChannel, LoggerChild } from "@trncs/balance-checker/libs/utils";

import SlackLogger from "../utils/SlackLogger";
import sendErrorLogs from "./sendErrorLogs";

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

describe("sendErrorLogs", () => {
	const goerliResolvedValue = {
		"0x123abc": {
			chain: "ethereum",
			isMainnet: false,
			message: "goerli test error msg",
		},
	};
	const homesteadResolvedValue = {
		"0x456def": {
			chain: "ethereum",
			isMainnet: true,
			message: "homestead test error msg",
		},
	};
	const porciniResolvedValue = {
		"0xabc123": {
			chain: "trn",
			isMainnet: false,
			message: "porcini test error msg",
		},
	};
	const mainnetResolvedValue = {
		"0xdef456": {
			chain: "trn",
			isMainnet: true,
			message: "mainnet test error msg",
		},
	};
	const testnetResolvedValue = {
		r123456: {
			chain: "xrpl",
			isMainnet: false,
			message: "testnet test error msg",
		},
	};
	const livenetResolvedValue = {
		r456789: {
			chain: "xrpl",
			isMainnet: true,
			message: "livenet test error msg",
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

	it("should not send notification/s when no error logs to process", async () => {
		// Mock the KV hgetall function
		mockedHgetall.mockResolvedValue(null);

		const slackWarnSpy = jest.spyOn(SlackLogger.prototype, "warn");
		const slackFatalSpy = jest.spyOn(SlackLogger.prototype, "fatal");

		await sendErrorLogs();

		expect(mockedHgetall).toHaveBeenCalledTimes(6);
		expect(mockedHgetall).toHaveBeenNthCalledWith(1, "error:ethereum:goerli");
		expect(mockedHgetall).toHaveBeenNthCalledWith(
			2,
			"error:ethereum:homestead"
		);
		expect(mockedHgetall).toHaveBeenNthCalledWith(3, "error:trn:porcini");
		expect(mockedHgetall).toHaveBeenNthCalledWith(4, "error:trn:mainnet");
		expect(mockedHgetall).toHaveBeenNthCalledWith(5, "error:xrpl:testnet");
		expect(mockedHgetall).toHaveBeenNthCalledWith(6, "error:xrpl:livenet");

		expect(console.warn).toHaveBeenCalledTimes(0);
		expect(console.error).toHaveBeenCalledTimes(0);
		expect(slackWarnSpy).toHaveBeenCalledTimes(0);
		expect(slackFatalSpy).toHaveBeenCalledTimes(0);
	});

	it("should send notification/s when there's error logs in all chains", async () => {
		// Mock the KV hgetall function
		mockedHgetall
			.mockResolvedValueOnce(goerliResolvedValue)
			.mockResolvedValueOnce(homesteadResolvedValue)
			.mockResolvedValueOnce(porciniResolvedValue)
			.mockResolvedValueOnce(mainnetResolvedValue)
			.mockResolvedValueOnce(testnetResolvedValue)
			.mockResolvedValueOnce(livenetResolvedValue);

		const slackErrorSpy = jest.spyOn(SlackLogger.prototype, "error");
		const slackFatalSpy = jest.spyOn(SlackLogger.prototype, "fatal");

		await sendErrorLogs();

		expect(mockedHgetall).toHaveBeenCalledTimes(6);

		expect(console.error).toHaveBeenCalledTimes(6);
		expect(slackErrorSpy).toHaveBeenCalledTimes(6);
		expect(slackFatalSpy).toHaveBeenCalledTimes(0);
	});

	it("should send notification/s when there's error logs in some chains", async () => {
		// Mock the KV hgetall function
		mockedHgetall
			.mockResolvedValueOnce(goerliResolvedValue)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(porciniResolvedValue)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(testnetResolvedValue)
			.mockResolvedValueOnce(null);

		const slackErrorSpy = jest.spyOn(SlackLogger.prototype, "error");
		const slackFatalSpy = jest.spyOn(SlackLogger.prototype, "fatal");

		await sendErrorLogs();

		expect(mockedHgetall).toHaveBeenCalledTimes(6);

		expect(console.error).toHaveBeenCalledTimes(3);
		expect(slackErrorSpy).toHaveBeenCalledTimes(3);
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

		const slackErrorSpy = jest.spyOn(SlackLogger.prototype, "error");
		const slackFatalSpy = jest.spyOn(SlackLogger.prototype, "fatal");

		await sendErrorLogs();

		expect(mockedHgetall).toHaveBeenCalledTimes(2);

		expect(slackErrorSpy).toHaveBeenCalledTimes(0);
		expect(console.error).toHaveBeenCalledTimes(1);
		expect(slackFatalSpy).toHaveBeenCalledTimes(1);

		expect(console.error).toHaveBeenCalledWith(new Error(expectedErrorMsg));
		expect(slackFatalSpy).toHaveBeenCalledWith(
			`Error on 'sendnotifications':\n\n${expectedErrorMsg}`
		);
	});

	it("should verify that the SlackLogger was instantiated 4x", async () => {
		await sendErrorLogs();

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
		await sendErrorLogs();

		expect(mockedSlackLogger.mock.calls[3]).toEqual([
			"BALANCE_CHECKER",
			LoggerChannel.BalanceCheck,
			LoggerChild.Any,
			undefined,
		]);

		mockedSlackLogger.mockReset();

		await sendErrorLogs(false);

		expect(mockedSlackLogger.mock.calls[3]).toEqual([
			"BALANCE_CHECKER",
			LoggerChannel.BalanceCheck,
			LoggerChild.Any,
			false,
		]);

		mockedSlackLogger.mockReset();

		await sendErrorLogs(true);

		expect(mockedSlackLogger.mock.calls[3]).toEqual([
			"BALANCE_CHECKER",
			LoggerChannel.BalanceCheck,
			LoggerChild.Any,
			true,
		]);
	});
});
