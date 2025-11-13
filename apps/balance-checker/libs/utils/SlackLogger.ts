import axios from "axios";
import * as https from "https";

import { SLACK_WEBHOOK_URL } from "@trncs/balance-checker/libs/constants";
import type {
	ColorsType,
	IColors,
	ISlackPayload,
} from "@trncs/balance-checker/libs/types";
import { LoggerChannel, LoggerChild } from "@trncs/utils/createSlackLogger";

const DEFAULT_COLORS: IColors = {
	info: "#2EB67D",
	warn: "#ECB22E",
	error: "#E01E5A",
	fatal: "#E01E5A",
};

export { LoggerChannel, LoggerChild };

export default class SlackLogger {
	#slackWebhookUrl: string;
	#serviceName: string;
	#channel: LoggerChannel;
	#child: LoggerChild;
	#payload: ISlackPayload;

	constructor(
		serviceName: string,
		channel: LoggerChannel,
		child: LoggerChild,
		isMainnet?: boolean
	) {
		this.#slackWebhookUrl = isMainnet
			? SLACK_WEBHOOK_URL.MAINNET
			: SLACK_WEBHOOK_URL.TESTNET;

		this.#serviceName = serviceName;
		this.#channel = channel;
		this.#child = child;

		this.#payload = {
			blocks: [],
			channel: `${serviceName} Service ${channel}:${child}`,
			text: "",
		};
	}

	set isMainnet(value: boolean) {
		this.#slackWebhookUrl = value
			? SLACK_WEBHOOK_URL.MAINNET
			: SLACK_WEBHOOK_URL.TESTNET;
	}

	async info(msg: string) {
		await this.sendToSlack(msg, "info");
	}

	async warn(msg: string) {
		await this.sendToSlack(msg, "warn");
	}

	async error(msg: string) {
		await this.sendToSlack(msg, "error");
	}

	async fatal(msg: string) {
		await this.sendToSlack(msg, "fatal");
	}

	async sendToSlack(msg: string, logLevel: ColorsType) {
		if (typeof msg === "string") {
			this.#payload.text = msg;
			this.#payload.blocks.push({
				type: "section",
				text: { type: "mrkdwn", text: `\`\`\`${msg}\`\`\`` },
			});
		}

		const date = new Date();
		this.#payload.blocks.push({
			type: "context",
			elements: [
				{
					type: "mrkdwn",
					text: `<!date^${Math.floor(
						date.getTime() / 1000
					)}^Posted {date_pretty} at {time_secs}|Posted ${date.toString()}>`,
				},
			],
		});

		this.#payload.attachments = [
			{
				color: DEFAULT_COLORS[logLevel],
				fields: [
					{
						title: "channel",
						value: `${this.#channel}:${this.#child}`,
						short: true,
					},
					{
						title: "service",
						value: `${this.#serviceName}`,
						short: true,
					},
				],
			},
		];

		await axios({
			method: "post",
			url: this.#slackWebhookUrl,
			headers: { "Content-Type": "application/json" },
			data: JSON.stringify(this.#payload),
			httpsAgent: new https.Agent({ keepAlive: true }),
		});
	}
}
