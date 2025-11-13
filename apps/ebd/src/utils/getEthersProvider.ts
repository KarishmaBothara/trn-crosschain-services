import { BaseProvider } from "@ethersproject/providers";
import { getDefaultProvider } from "ethers";

import { alchemyApiToken, ethNetwork, infuraApiToken } from "@trncs/ebd/config";

export function getEthersProvider(): BaseProvider {
	return getDefaultProvider(ethNetwork!, {
		...(infuraApiToken && { infura: infuraApiToken }),
		...(alchemyApiToken && { alchemy: alchemyApiToken }),
		etherscan: "-",
		pocket: "-",
		ankr: "-",
		cloudflare: "-",
		// Alchemy doesn't support Sepolia
		quorum: ethNetwork === "sepolia" ? 1 : 2,
	});
}
