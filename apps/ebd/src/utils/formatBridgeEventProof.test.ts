import { describe, expect, it } from "@jest/globals";

import { ECDSASignature } from "../prisma";
import { formatBridgeEventProof } from "./formatBridgeEventProof";

describe("formatBridgeEventProof", () => {
	it(`should...
			- convert args to an expected object`, () => {
		const eventId = 1;
		const validatorSetId = 1;
		const validators = ["0x00", "0x00"];
		const signature = { r: ["0x00"], s: ["0x00"], v: [1] } as ECDSASignature;

		const result = formatBridgeEventProof(
			eventId,
			validatorSetId,
			validators,
			signature
		);
		const expected = {
			eventId,
			validatorSetId,
			validators,
			v: signature!.v,
			r: signature!.r,
			s: signature!.s,
		};
		expect(result).toStrictEqual(expected);
	});
});
