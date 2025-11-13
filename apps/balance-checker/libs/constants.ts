export const ABI_BALANCE_OF = [
	"function balanceOf(address) view returns (uint256)",
];

export const SLACK_WEBHOOK_URL = {
	TESTNET: `https://hooks.slack.com/services/${
		process.env.SLACK_WEBHOOK_SECRET_TESTNET ?? ""
	}`,
	MAINNET: `https://hooks.slack.com/services/${
		process.env.SLACK_WEBHOOK_SECRET_MAINNET ?? ""
	}`,
};

export const NETWORK = {
	ethereum: {
		goerli: {
			ApiCreds: {
				Alchemy: {
					token: process.env.ETH_ALCHEMY_API_TOKEN_TESTNET ?? "",
				},
				Infura: {
					token: process.env.ETH_INFURA_API_TOKEN_TESTNET ?? "",
					secret: process.env.ETH_INFURA_API_SECRET_TESTNET ?? "",
				},
			},
		},
		homestead: {
			ApiCreds: {
				Alchemy: {
					token: process.env.ETH_ALCHEMY_API_TOKEN_MAINNET ?? "",
				},
				Infura: {
					token: process.env.ETH_INFURA_API_TOKEN_MAINNET ?? "",
					secret: process.env.ETH_INFURA_API_SECRET_MAINNET ?? "",
				},
			},
		},
	},
	trn: {
		porcini: {
			ApiUrl: {
				InRPC: "https://porcini.rootnet.app/",
			},
		},
		root: {
			ApiUrl: {
				InRPC: "https://root.rootnet.live/",
			},
		},
	},
	xrpl: {
		testnet: {
			ApiUrl: {
				InWS: "wss://s.altnet.rippletest.net:51233",
			},
		},
		livenet: {
			ApiUrl: {
				InWS: "wss://ws.xrpl.int.futureverse.app",
			},
		},
	},
};

export const SHARED_KEY: string = process.env.SHARED_KEY ?? "";

const VERCEL_ENV = process.env.VERCEL_ENV ?? "development";

export const ACCOUNTS_TOKENS =
	VERCEL_ENV === "production"
		? "/accounts-tokens.json"
		: VERCEL_ENV === "preview"
		? "/accounts-tokens.preview.json"
		: "/accounts-tokens.local.json";

export const chains = ["ethereum", "trn", "xrpl"] as const;
export const ethNetworks = ["goerli", "homestead"] as const;
export const rootNetworks = ["porcini", "root"] as const;
export const xrplNetworks = ["testnet", "livenet"] as const;
