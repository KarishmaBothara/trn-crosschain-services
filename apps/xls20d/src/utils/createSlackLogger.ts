import {
	createSlackLogger as createLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/utils/createSlackLogger";
import { slackWebhookUrl } from "@trncs/xls20d/config";

export { LoggerChannel, LoggerChild };

export const createSlackLogger = createLogger.bind(
	null,
	slackWebhookUrl,
	"XLS20"
);
