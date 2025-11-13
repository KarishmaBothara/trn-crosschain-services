import { cleanEnv, num, str, url } from "envalid";

const optional = cleanEnv(process.env, {
	GAS_MULTIPLIER: num({ default: 1.02 }),
	ROOT_OUTBOX_ROLE_SEED: str({ default: undefined }),
	SLACK_WEBHOOK_URL: url({ default: undefined }),
});

const env = cleanEnv(process.env, {
	XRPL_API_URL: url(),
	XRPL_API_URL_RIPPLE: url({ default: "wss://s1.ripple.com:51234/" }),
	XRPL_API_URL_QUICK_NODE: url({
		default: "wss://s.altnet.rippletest.net:51233",
	}),
	ARCHIVE_ENDPOINT: url(),
	ROOT_WS_ENDPOINT: url(),
	XRPL_MINTER_ACCOUNT: str(),
	XRPL_MINTER_SEED: str(),
	JEN_XRPL_MINTER_SEED: str(),
	JEN_COLLECTIONS: str(),
	ROOT_RELAYER_SEED: str(),
	XRPL_PROCESSOR_DURATION: num(),
	DB_URL: str(),
	REDIS_URL: str({ default: "redis://localhost:6379" }),
	FASTIFY_PORT: num({ default: 3000 }),
	TOKEN_BRIDGE_FEE: num({ default: 10 }),
	TRN_HTTP_ENDPOINTS: str({
		default:
			// "https://root.oreg.prod.rootnet.app/archive,https://root.fra.prod.rootnet.app/archive,https://root.rootnet.live/archive",
			"https://porcini.rootnet.app/archive/",
	}),
});
export const xrplMinterAccount = env.XRPL_MINTER_ACCOUNT;

export const xrplMinterSeed = env.XRPL_MINTER_SEED;

export const relayerSeed = env.ROOT_RELAYER_SEED;

export const gasMultiplier = optional.GAS_MULTIPLIER;

export const slackWebhookUrl = optional.SLACK_WEBHOOK_URL;

export const xrplApiUrl = env.XRPL_API_URL;

export const xrplApiRippleUrl = env.XRPL_API_URL_RIPPLE;

export const xrplProcessorDuration = env.XRPL_PROCESSOR_DURATION;

export const archiveEndpoint = env.ARCHIVE_ENDPOINT;

export const rootWSEndpoint = env.ROOT_WS_ENDPOINT;

export const redisUrl = env.REDIS_URL;

export const fastifyPort = env.FASTIFY_PORT;

export const xrplApiUrlQuickNode = env.XRPL_API_URL_QUICK_NODE;

export const jenCollections: string[] = env.JEN_COLLECTIONS?.split(",") ?? [];

export const jenXrplMinterSeed = env.JEN_XRPL_MINTER_SEED;

export const tokenBridgeFee = env.TOKEN_BRIDGE_FEE;

export const trnHttpEndpoints: string[] =
	env.TRN_HTTP_ENDPOINTS?.split(",") ?? [];
