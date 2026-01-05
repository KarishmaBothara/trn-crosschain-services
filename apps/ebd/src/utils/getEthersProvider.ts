import { AlchemyProvider, BaseProvider, FallbackProvider, InfuraProvider } from "@ethersproject/providers";

import { alchemyApiToken, ethNetwork, infuraApiToken } from "@trncs/ebd/config";

export function getEthersProvider(): BaseProvider {
	const network = ethNetwork!;
	const configs = [];

	// 1. Configure Infura as Preferred (Priority 1)
	if (infuraApiToken) {
		configs.push({
			provider: new InfuraProvider(
				network,
				infuraApiToken
			),
			priority: 1, // Lower numbers are tried first
			weight: 1,
			stallTimeout: 2000 // Wait 2s for Infura before trying Alchemy
		});
	}

	// 2. Configure Alchemy as Fallback (Priority 2)
	if (alchemyApiToken) {
		configs.push({
			provider: new AlchemyProvider(network, alchemyApiToken),
			priority: 2,
			weight: 1
		});
	}

	// Return a FallbackProvider that respects the priority order
	return new FallbackProvider(configs, 1);
}
