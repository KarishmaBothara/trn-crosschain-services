import { cleanEnv, makeValidator, num, str, url } from "envalid";

const optional = cleanEnv(process.env, {
	GAS_MULTIPLIER: num({ default: 1.02 }),
	ROOT_RELAYER_SEED: str({ default: undefined }),
	INFURA_API_SECRET: str({ default: undefined }),
	SLACK_WEBHOOK_URL: url({ default: undefined }),
	DEV_CALLERS: str({ default: process.env.IGNORE_DEV_ACCOUNTS_ETH }),
	SLACK_MENTIONS: str({ default: "<@U04TNHR5KT3>, <@U04AQU8TJ11>" }),
	BLOCK_DELAY: num({ default: 12 }),
});

const infura = makeValidator((apiToken: string) => {
	if (!optional.INFURA_API_SECRET) return apiToken;

	return {
		projectId: apiToken,
		projectSecret: optional.INFURA_API_SECRET,
	};
});

const env = cleanEnv(process.env, {
	ARCHIVE_ENDPOINT: url(),
	ROOT_WS_ENDPOINT: url(),
	ALCHEMY_API_TOKEN: str(),
	INFURA_API_TOKEN: infura(),
	BRIDGE_CONTRACT_ADDRESS: str(),
	FASTIFY_PORT: num({ default: 3000 }),
	ETH_NETWORK: str({
		choices: ["homestead", "sepolia"],
	}),
	INBOX_RELAYER_SEED: str({ default: optional.ROOT_RELAYER_SEED }),
	OUTBOX_RELAYER_SEED: str({ default: optional.ROOT_RELAYER_SEED }),
	DB_URL: str(),
	REDIS_URL: str(),
	TRN_HTTP_ENDPOINTS: str({
		default:
			"https://root.oreg.prod.rootnet.app/archive,https://root.fra.prod.rootnet.app/archive,https://root.rootnet.live/archive",
	}),
});

export const archiveEndpoint = env.ARCHIVE_ENDPOINT;

export const ethNetwork = env.ETH_NETWORK;

export const bridgeContractAddress = env.BRIDGE_CONTRACT_ADDRESS;

export const rootWSEndpoint = env.ROOT_WS_ENDPOINT;

export const alchemyApiToken = env.ALCHEMY_API_TOKEN;

export const infuraApiToken = env.INFURA_API_TOKEN;

export const inboxRelayerSeed = env.INBOX_RELAYER_SEED;

export const outboxRelayerSeed = env.OUTBOX_RELAYER_SEED;

export const gasMultiplier = optional.GAS_MULTIPLIER;

export const slackWebhookUrl = optional.SLACK_WEBHOOK_URL;

export const pegPalletAddress: Record<"bridge" | "erc20" | "erc721", string> = {
	bridge: "0x6D6f646C65746879627264670000000000000000",
	erc20: "0x6D6f646c65726332307065670000000000000000",
	erc721: "0x6D6F646c726e2F6E667470670000000000000000",
};

export const redisUrl = env.REDIS_URL;

export const devCallers: string[] = optional.DEV_CALLERS?.split(",") ?? [];

export const fastifyPort = env.FASTIFY_PORT;

export const slackMentions = optional.SLACK_MENTIONS;

export const blockDelay = optional.BLOCK_DELAY;

export const trnHttpEndpoints: string[] =
	env.TRN_HTTP_ENDPOINTS?.split(",") ?? [];
