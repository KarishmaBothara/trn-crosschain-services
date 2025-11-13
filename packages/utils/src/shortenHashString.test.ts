import { describe, expect, it } from "@jest/globals";

import { shortenHashString } from "./shortenHashString";

const hash = "1234567890123456789012345678901234567890123456789012345678901234";
const hashWithPrefix =
	"0x1234567890123456789012345678901234567890123456789012345678901234";

describe("shortenHashString", () => {
	it(`should...
			- return the first and last 10 chars of string by default
	`, () => {
		const hash =
			"1234567890123456789012345678901234567890123456789012345678901234";
		const result = shortenHashString(hash);
		expect(result).toBe("1234567890..5678901234");
	});
	it(`should...
			- return the first and last 5 chars of string
	`, () => {
		const result = shortenHashString(hash, 5);
		expect(result).toBe("12345..01234");
	});

	it(`should...
			- return the first and last 5 chars of string plus prefix
	`, () => {
		const result = shortenHashString(hashWithPrefix, 5);
		expect(result).toBe("0x12345..01234");
	});
});
