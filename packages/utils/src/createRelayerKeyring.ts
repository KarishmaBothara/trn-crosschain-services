import { Keyring } from "@polkadot/keyring";
import { hexToU8a } from "@polkadot/util";

export type Signer = ReturnType<InstanceType<typeof Keyring>["addFromSeed"]>;

export function createRelayerKeyring(seed: string): Signer {
	const keyring = new Keyring({ type: "ethereum" });
	const seedU8a = hexToU8a(seed);
	return keyring.addFromSeed(seedU8a);
}
