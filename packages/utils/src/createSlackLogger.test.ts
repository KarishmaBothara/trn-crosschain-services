/* eslint-disable @typescript-eslint/no-var-requires */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as os from "os";
import { pino } from "pino";

import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "./createSlackLogger";

let $slackWebhookUrl: string;

jest.mock("pino", () => {
	return {
		__esModule: true,
		pino: jest.fn(),
	};
});

describe("createSlackLogger", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should...
			- calls \`pino\` function...
				- with a correct \`base\` option
				- without a \`transport\` option
	`, async () => {
		createSlackLogger(
			$slackWebhookUrl,
			"EBD",
			LoggerChannel.Incoming,
			LoggerChild.Ethereum
		);
		const $pino = jest.mocked(pino);

		expect($pino).toBeCalledTimes(1);
		expect($pino.mock.calls[0][0]).toStrictEqual({
			base: { channel: "ibx:ethereum", host: os.hostname(), service: "EBD" },
			transport: undefined,
		});
	});

	it(`should...
			- calls \`pino\` function...
				- with a correct \`base\` option
				- with a correct \`transport\` option
	`, async () => {
		$slackWebhookUrl = "https//";
		createSlackLogger(
			$slackWebhookUrl,
			"EBD",
			LoggerChannel.Outgoing,
			LoggerChild.Ethereum
		);
		const $pino = jest.mocked(pino);

		expect($pino).toBeCalledTimes(1);
		expect($pino.mock.calls[0][0]).toStrictEqual({
			base: { channel: "obx:ethereum", host: os.hostname(), service: "EBD" },
			transport: {
				options: {
					channelKey: "EBD Service obx:ethereum",
					webhookUrl: "https//",
				},
				target: "pino-slack-transport",
			},
		});
	});
});
