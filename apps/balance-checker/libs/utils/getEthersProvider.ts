import { getDefaultProvider } from "ethers";

import { NETWORK } from "@trncs/balance-checker/libs/constants";
import type { EthNetworkType } from "@trncs/balance-checker/libs/types";

export default function getEthersProvider(ethNetwork: EthNetworkType) {
	const infuraApiToken = NETWORK.ethereum[ethNetwork].ApiCreds.Infura.token;
	const infuraApiSecret = NETWORK.ethereum[ethNetwork].ApiCreds.Infura.secret;
	const alchemyApiToken = NETWORK.ethereum[ethNetwork].ApiCreds.Alchemy.token;

	return getDefaultProvider(ethNetwork!, {
		...(infuraApiToken && {
			infura: { projectId: infuraApiToken, projectSecret: infuraApiSecret },
		}),
		...(alchemyApiToken && { alchemy: alchemyApiToken }),
		etherscan: "-",
		pocket: "-",
		ankr: "-",
		quicknode: "-",
		cloudflare: "-",
	});
}
