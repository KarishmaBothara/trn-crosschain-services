import {
	createSlackLogger as createLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/utils/createSlackLogger";
import { slackWebhookUrl } from "@trncs/xbd/config";

export { LoggerChannel, LoggerChild };

export const createSlackLogger = createLogger.bind(
	null,
	slackWebhookUrl,
	"XBD"
);
