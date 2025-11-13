import { hexToU8a, u8aToHex } from "@polkadot/util";
import assert from "assert";

import { ECDSASignature } from "@trncs/ebd/prisma";

export function createECDSASignature(signatures: string[]): ECDSASignature {
	const ecdsa: ECDSASignature = {
		r: [],
		s: [],
		v: [],
	};

	signatures.forEach((signature) => {
		const sigU8a = hexToU8a(signature);
		const rSlice = sigU8a.slice(0, 32);
		ecdsa.r.push(u8aToHex(rSlice));
		const sSlice = sigU8a.slice(32, 64);
		ecdsa.s.push(u8aToHex(sSlice));
		let v = sigU8a[64];
		if (v < 27) {
			assert(v <= 1, `Signature has invalid \`v\` byte`);
			v += 27;
		}
		ecdsa.v.push(v);
	});

	return ecdsa;
}
