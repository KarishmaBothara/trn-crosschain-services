import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { submitTransaction } from "./submitTransaction";

describe("submitTransaction", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should...
			- returns the result from \`fn\` function
	`, async () => {
		const mockFn = jest.fn(() => Promise.resolve(1));
		const mockWarn = jest.fn();

		const result = await submitTransaction(mockFn, { log: { warn: mockWarn } });

		expect(result).toEqual(1);
		expect(mockFn).toBeCalledTimes(1);
		expect(mockWarn).toBeCalledTimes(0);
	});

	it(`should...
			- receives a retry-able error "Operation timed out (os error 110)"
			- retries \`n\` times then throws the same error`, async () => {
		const mockWarn = jest.fn(() => Promise.resolve());

		try {
			await submitTransaction(
				async () => {
					throw new Error(`
Error occurred during query execution:
ConnectorError(ConnectorError { user_facing_error: None, kind: RawDatabaseError { code: "unknown", message: "Operation timed out (os error 110)" } })`);
				},
				{ log: { warn: mockWarn }, maxRetry: 5 }
			);
		} catch (error) {
			const { message } = error as { message: string };
			expect(message).toContain("Operation timed out (os error 110)");
			expect(mockWarn).toBeCalledTimes(5);
		}
	});

	it(`should...
			- receives a retry-able error "unexpected end of file"
			- retries \`n\` times then throws the same error`, async () => {
		const mockWarn = jest.fn(() => Promise.resolve());

		try {
			await submitTransaction(
				async () => {
					throw new Error(`
Error occurred during query execution:
ConnectorError(ConnectorError { user_facing_error: None, kind: RawDatabaseError { code: "unknown", message: "unexpected end of file" } })`);
				},
				{ log: { warn: mockWarn }, maxRetry: 5 }
			);
		} catch (error) {
			const { message } = error as { message: string };
			expect(message).toContain("unexpected end of file");
			expect(mockWarn).toBeCalledTimes(5);
		}
	});

	it(`should...
			- receives a not retry-able error
			- throws the same error`, async () => {
		const mockWarn = jest.fn(() => Promise.resolve());

		try {
			await submitTransaction(
				async () => {
					throw new Error("Invalid invocation");
				},
				{ log: { warn: mockWarn }, maxRetry: 5 }
			);
		} catch (error) {
			const { message } = error as { message: string };
			expect(message).toBe("Invalid invocation");
			expect(mockWarn).toBeCalledTimes(0);
		}
	});
});
