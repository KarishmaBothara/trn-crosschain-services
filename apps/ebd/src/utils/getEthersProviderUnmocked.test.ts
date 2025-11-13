import { AlchemyProvider, InfuraProvider } from "@ethersproject/providers";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { getEthersProvider } from "./getEthersProvider";

let $ethNetwork: string | void = "";
let $alchemyApiToken: string | void = "";
let $infuraApiToken:
	| { projectId: string; projectSecret: string }
	| string
	| void = "";

jest.mock("@trncs/ebd/config", () => {
	return {
		__esModule: true,
		get ethNetwork() {
			return $ethNetwork;
		},
		get alchemyApiToken() {
			return $alchemyApiToken;
		},
		get infuraApiToken() {
			return $infuraApiToken;
		},
	};
});

describe("getEthersProvider", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should...
			- have quorum of 2 for homestead network
			- contain \`InfuraProvider\` and \`AlchemyProvider\` for homestead network
	`, () => {
		$ethNetwork = "homestead";
		$infuraApiToken = "INFURA123ABC";
		$alchemyApiToken = "ALCHEMY123ABC";

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const provider = getEthersProvider() as any;
		const { quorum, providerConfigs } = provider;

		expect(quorum).toBe(2);
		expect(providerConfigs.length).toBe(2);

		expect(providerConfigs[0].provider).toBeInstanceOf(InfuraProvider);
		expect(providerConfigs[1].provider).toBeInstanceOf(AlchemyProvider);
	});

	it(`should...
			- have quorum of 1 for sepolia network
			- only contain \`InfuraProvider\` for sepolia network
	`, () => {
		$ethNetwork = "sepolia";
		$infuraApiToken = "INFURA123ABC";
		$alchemyApiToken = "ALCHEMY123ABC";

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const provider = getEthersProvider() as any;
		const { quorum, providerConfigs } = provider;

		expect(quorum).toBe(1);
		expect(providerConfigs.length).toBe(1);

		expect(providerConfigs[0].provider).toBeInstanceOf(InfuraProvider);
		expect(providerConfigs[1]?.provider).toBe(undefined);
	});
});
