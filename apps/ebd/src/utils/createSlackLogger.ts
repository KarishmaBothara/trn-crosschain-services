import { slackWebhookUrl } from "@trncs/ebd/config";
import {
	createSlackLogger as createLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/utils/createSlackLogger";

export { LoggerChannel, LoggerChild };

export const createSlackLogger = createLogger.bind(
	null,
	slackWebhookUrl,
	"EBD"
);
