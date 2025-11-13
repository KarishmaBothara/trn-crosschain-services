import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { ApiPromise, WsProvider } from "@polkadot/api";

import { apiOptions, getChainApi } from "./getChainApi";

let $rootWSEndpoint: string | void = "";
const sampleResult = "Sample Result";

jest.mock("@polkadot/api", () => {
	const { WsProvider } =
		jest.createMockFromModule<typeof import("@polkadot/api")>("@polkadot/api");
	return {
		__esModule: true,
		WsProvider,
		ApiPromise: {
			create: jest.fn(() => sampleResult),
		},
	};
});

describe("getChainApi", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it(`should...
		- calls \`ApiPromise.create\` function...
			- with the correct \`WsProvider\` instance...
				- with the correct network endpoint value in \`@/config\`
	`, async () => {
		$rootWSEndpoint = "wss://";

		const result = getChainApi($rootWSEndpoint);

		const provider = (WsProvider as jest.Mock).mock.instances[0];
		const $ApiPromise = jest.mocked(ApiPromise);

		expect(provider).toBeInstanceOf(WsProvider);
		expect(WsProvider).toHaveBeenCalledWith($rootWSEndpoint);
		expect($ApiPromise.create).toBeCalled();
		expect($ApiPromise.create.mock.calls[0][0]).toEqual(
			apiOptions(provider as WsProvider)
		);

		await expect(result).resolves.toBe(sampleResult);
	});

	it(`should...
		- creates a single \`ApiPromise\` instance no matter how many calls
	`, async () => {
		$rootWSEndpoint = "wss://";

		const spy = jest.spyOn(ApiPromise, "create");

		await getChainApi($rootWSEndpoint);
		await getChainApi($rootWSEndpoint);

		expect(spy).toHaveBeenCalledTimes(1);
	});
});
