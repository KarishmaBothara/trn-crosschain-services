import { hostname } from "node:os";
import { Logger, pino } from "pino";

export enum LoggerChannel {
	Incoming = "ibx",
	Outgoing = "obx",
	Ticket = "tck",
	BalanceCheck = "bal",
}

export enum LoggerChild {
	Root = "root",
	Xrpl = "xrpl",
	Ethereum = "ethereum",
	Any = "any",
}

const logs: Record<string, Logger> = {};
export function createSlackLogger(
	slackWebhookUrl: string,
	serviceName: string,
	channel: LoggerChannel,
	child: LoggerChild
): Logger {
	if (logs?.[channel + child]) return logs[channel + child];
	return (logs[channel + child] = pino({
		base: {
			channel: `${channel}:${child}`,
			service: serviceName,
			host: hostname(),
		},
		transport: slackWebhookUrl
			? {
					target: "pino-slack-transport",
					options: {
						webhookUrl: slackWebhookUrl,
						channelKey: `${serviceName} Service ${channel}:${child}`,
					},
			  }
			: undefined,
	}));
}
