import { describe, expect, it, jest } from "@jest/globals";
import { ApiPromise } from "@polkadot/api";

import { fetchFinalisedHead } from "./fetchFinalisedHead";

const api = {
	rpc: {
		chain: {
			getFinalizedHead: jest.fn(() => "0x0001"),
			getBlock: jest.fn(() => ({
				block: {
					header: {
						number: {
							toNumber: () => 1,
						},
					},
				},
			})),
		},
	},
} as unknown as ApiPromise;

describe("getFinalizedHead", () => {
	it(`should...
      - call \`rpc.chain.getFinalizedHead\` once
      - return the value from \`rpc.chain.getBlock\` call
  `, async () => {
		const height = await fetchFinalisedHead(api);
		const $getFinalizedHead = jest.mocked(api.rpc.chain.getFinalizedHead);
		const $getBlock = jest.mocked(api.rpc.chain.getBlock);

		expect($getFinalizedHead).toBeCalledTimes(1);
		expect($getBlock).toBeCalledTimes(1);
		expect($getBlock.mock.calls[0][0]).toEqual("0x0001");
		expect(height).toEqual(1);
	});
});
