/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, jest } from "@jest/globals";
import { Keyring } from "@polkadot/api";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { hexToU8a } from "@polkadot/util";

import { submitExtrinsic } from "./submitExtrinsic";
import { waitFor } from "./waitFor";

describe("submitExtrinsic", () => {
	it(`should ...
			- resolves a promise when conditions are met`, async () => {
		const signer = getSigner();
		const signAndSend = jest.fn(((_, __, cb: any) => {
			const result = {
				status: {
					asInBlock: { toString: () => "0x0" },
					type: "InBlock",
				},
				txHash: "0x1",
				txIndex: 1,
				dispatchError: null,
			};

			cb(result);
			return Promise.resolve("hash" as any);
		}) as SubmittableExtrinsic<"promise">["signAndSend"]);
		const response = await submitExtrinsic({ signAndSend } as any, signer, {
			timeout: 100,
		});
		expect(signAndSend).toBeCalledTimes(1);
		expect(response.blockHash).toEqual("0x0");
		expect(response.extrinsicHash).toEqual("0x1");
		expect(response.extrinsicIndex).toEqual(1);
	});

	it(`should...
			- throws generic error when error is non-module`, async () => {
		const signer = getSigner();
		const signAndSend = jest.fn(((_, __, cb: any) => {
			const result = {
				status: {
					type: "InBlock",
				},
				dispatchError: {
					isModule: false,
					toJSON: () => "{}",
				},
			};

			cb(result);
			return Promise.resolve("hash" as any);
		}) as SubmittableExtrinsic<"promise">["signAndSend"]);

		const error = await submitExtrinsic(
			{
				signAndSend,
			} as any,
			signer,
			{
				timeout: 100,
			}
		).catch((error) => error);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toStrictEqual(`Extrinsic failed, dispatchError="{}"`);
	});

	it(`should...
			- throws detailed error when error is module`, async () => {
		const signer = getSigner();
		const signAndSend = jest.fn(((_, __, cb: any) => {
			const result = {
				status: {
					type: "InBlock",
				},
				dispatchError: {
					isModule: true,
					registry: {
						findMetaError: () => ({
							section: "system",
							name: "remark",
							docs: "Unknown",
						}),
					},
				},
			};

			cb(result);
			return Promise.resolve("hash" as any);
		}) as SubmittableExtrinsic<"promise">["signAndSend"]);

		const error = await submitExtrinsic(
			{
				signAndSend,
			} as any,
			signer,
			{
				timeout: 100,
			}
		).catch((error) => error);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toStrictEqual(
			`Extrinsic sending failed, [system.remark] Unknown`
		);
	});

	it(`should...
			- throws "timeout" error when submitting takes a long time`, async () => {
		const signer = getSigner();
		const signAndSend = jest.fn((async (_, __, cb: any) => {
			await waitFor(1000);

			const result = {
				status: {
					type: "InBlock",
				},
				dispatchError: {
					isModule: true,
					registry: {
						findMetaError: () => ({
							section: "system",
							name: "remark",
							docs: "Unknown",
						}),
					},
				},
			};

			cb(result);
			return Promise.resolve("hash" as any);
		}) as SubmittableExtrinsic<"promise">["signAndSend"]);

		const error = await submitExtrinsic(
			{
				signAndSend,
			} as any,
			signer,
			{
				timeout: 100,
			}
		).catch((error) => error);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toStrictEqual(`Extrinsic timeout`);
	});

	it(`should...
			- throws "Extrinsic usurped" error when status is Usurped`, async () => {
		const signer = getSigner();
		const signAndSend = jest.fn((async (_, __, cb: any) => {
			const result = {
				status: {
					type: "Usurped",
				},

				toHuman() {
					return "{}";
				},
			};

			cb(result);
			return Promise.resolve("hash" as any);
		}) as SubmittableExtrinsic<"promise">["signAndSend"]);

		const error = await submitExtrinsic(
			{
				signAndSend,
			} as any,
			signer,
			{
				timeout: 100,
			}
		).catch((error) => error);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toStrictEqual(`Extrinsic usurped, result="{}"`);
	});
});

function getSigner(): ReturnType<InstanceType<typeof Keyring>["addFromUri"]> {
	const keyring = new Keyring({ type: "ethereum" });
	return keyring.addFromSeed(
		hexToU8a(
			"0x7fb717a37abe1f488e00fd5672717de550df09b5fc2f8b015f1c8778ef5144d4"
		)
	);
}
