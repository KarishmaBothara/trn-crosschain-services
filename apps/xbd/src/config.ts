import { cleanEnv, num, str, url } from "envalid";

const optional = cleanEnv(process.env, {
	SLACK_WEBHOOK_URL: url({ default: undefined }),
	DEV_CALLERS: str({ default: process.env.IGNORE_DEV_ACCOUNTS_XRPL }),
	SLACK_MENTIONS: str({ default: "<@U04TNHR5KT3>, <@U04AQU8TJ11>" }),
});

const env = cleanEnv(process.env, {
	XRPL_API_URL: url(),
	ARCHIVE_ENDPOINT: url(),
	ROOT_WS_ENDPOINT: url(),
	XRPL_DOOR_ACCOUNT: str(),
	XRPL_DOOR_SEED: str(),
	XRPL_MINT_DOOR_SEED: str(),
	ROOT_RELAYER_SEED: str(),
	ROOT_NETWORK: str({ default: "porcini" }),
	REDIS_URL: str(),
	FASTIFY_PORT: num({ default: 3000 }),
	TRN_HTTP_ENDPOINTS: str({
		default:
			"https://root.oreg.prod.rootnet.app/archive,https://root.fra.prod.rootnet.app/archive,https://root.rootnet.live/archive",
	}),
	MIN_AMOUNT_THRESHOLD: num({ default: 40 })
});

export const xrplApiUrl = env.XRPL_API_URL;

export const xrplDoorAccount = env.XRPL_DOOR_ACCOUNT;

export const xrplDoorSeed = env.XRPL_DOOR_SEED;

export const xrplMinterDoorSeed = env.XRPL_MINT_DOOR_SEED;

export const archiveEndpoint = env.ARCHIVE_ENDPOINT;

export const rootWSEndpoint = env.ROOT_WS_ENDPOINT;

export const rootRelayerSeed = env.ROOT_RELAYER_SEED;

export const rootNetwork = env.ROOT_NETWORK;

export const slackWebhookUrl = optional.SLACK_WEBHOOK_URL;

export const redisUrl = env.REDIS_URL;

export const devCallers: string[] = optional.DEV_CALLERS?.split(",") ?? [];

export const fastifyPort = env.FASTIFY_PORT;

export const slackMentions = optional.SLACK_MENTIONS;

export const trnHttpEndpoints: string[] =
	env.TRN_HTTP_ENDPOINTS?.split(",") ?? [];

export const minAmountThreshold = env.MIN_AMOUNT_THRESHOLD;
