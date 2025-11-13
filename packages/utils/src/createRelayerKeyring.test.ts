import { describe, expect, it, jest } from "@jest/globals";
import { Keyring } from "@polkadot/keyring";
import { hexToU8a } from "@polkadot/util";

import { createRelayerKeyring } from "./createRelayerKeyring";

const $inboxRelayerSeed =
	"0x56938bc2fd0275837087fcb26b00f7e316690f1e54c8b45e9e723cca48e4db7b";

jest.mock("@polkadot/keyring");

/* 
  NOTE:
  A `TypeError: (0 , _util.detectPackage) is not a function` error happens
  when mocking the `@polkadot/keyring` and `@polkadot/util` together.
  So, just mocking the `@polkadot/keyring` and not including a mock for `hexToU8a`
  will do just fine
 */

describe("createRelayerKeyring", () => {
	it(`should...
			- creates a \`Keyring\` instance...
				- with correct Uint8Array \`seed\` value
	`, async () => {
		createRelayerKeyring($inboxRelayerSeed);

		const $Keyring = jest.mocked(Keyring);
		expect($Keyring).toBeCalled();

		const $addFromSeed = jest.spyOn(Keyring.prototype, "addFromSeed");
		expect($addFromSeed).toHaveBeenCalledWith(hexToU8a($inboxRelayerSeed));
	});
});
