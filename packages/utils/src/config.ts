import { cleanEnv, num, str } from "envalid";

const optional = cleanEnv(process.env, {
	MIN_XRP_IN_WALLET: num({ default: 500 }), // 500 XRP
	MIN_ETH_IN_WALLET: str({ default: "1.0" }), // 1 ETH
});

export const minXRPInWallet = optional.MIN_XRP_IN_WALLET;

export const minEthInWallet = optional.MIN_ETH_IN_WALLET;
