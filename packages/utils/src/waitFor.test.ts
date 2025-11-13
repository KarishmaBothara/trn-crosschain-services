import { describe, expect, it, jest } from "@jest/globals";

import { waitFor } from "./waitFor";

/* eslint-disable @typescript-eslint/no-var-requires */
jest.spyOn(global, "setTimeout");

describe("waitFor", () => {
	it(`should...
			- calls \`setTimeout\` with correct args`, async () => {
		await waitFor(10);
		expect(setTimeout).toHaveBeenCalledTimes(1);
		expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 10);
	});
	it(`should...
			- accepts optional \`value\` parameter`, async () => {
		const [value1, value2] = await Promise.all([waitFor(5), waitFor(5, 1)]);
		expect(value1).toBeUndefined();
		expect(value2).toStrictEqual(1);
	});
});
