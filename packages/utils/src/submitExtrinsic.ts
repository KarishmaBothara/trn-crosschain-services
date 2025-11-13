import { SubmittableResult } from "@polkadot/api";
import {
	AddressOrPair,
	SignerOptions,
	SubmittableExtrinsic,
} from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";

import { Logger } from "./types";
import { waitFor } from "./waitFor";

export interface SubmittableResponse {
	extrinsicHash: string;
	extrinsicIndex: number;
	blockHash: string;
	result: SubmittableResult;
}

type SubmitOptions = Partial<SignerOptions> & {
	log?: Logger;
	timeout?: number;
};

/**
 * A simple wrapper for `extrinsic.signAndSend` that resolve when the
 * extrinsic is InBlock
 *
 * @param extrinsic - A submittable extrinsic form ApiProimse type
 * @param signer - A keyring pair to sign the extrinsic
 * @param options - Options for Siger when signing the extrisinc
 * @returns - A simple object of SubmittableResponse
 */
export async function submitExtrinsic(
	extrinsic: SubmittableExtrinsic<"promise", ISubmittableResult>,
	signer: AddressOrPair,
	options: SubmitOptions = {}
): Promise<SubmittableResponse> {
	const { log, timeout = 120000, ...signerOptions } = options;
	const result = await Promise.race<
		[Promise<SubmittableResponse>, Promise<"timeout">]
	>([
		new Promise((resolve, reject) => {
			let unsubscribe: () => void;
			extrinsic
				// Nonce of '-1' instructs the API to query the next available nonce
				// Reference: https://polkadot.js.org/docs/api/cookbook/tx/#how-do-i-take-the-pending-tx-pool-into-account-in-my-nonce
				.signAndSend(signer, { nonce: -1, ...signerOptions }, (result) => {
					const { status, dispatchError, txHash, txIndex } = result;
					log?.info(
						`extrinsic status=${
							status.type
						}, extrinsic result = ${JSON.stringify(result.toHuman())}`
					);

					// if there is `dispatchError`, process and reject promise accordingly
					// this most likely happen during the `InBlock` & `Finalized` state
					if (dispatchError) {
						unsubscribe?.();
						if (!dispatchError.isModule) {
							return reject(
								new Error(
									`Extrinsic failed, dispatchError=${JSON.stringify(
										dispatchError.toJSON()
									)}`
								)
							);
						}

						const { section, name, docs } =
							dispatchError.registry.findMetaError(dispatchError.asModule);

						reject(
							new Error(
								`Extrinsic sending failed, [${section}.${name}] ${docs}`
							)
						);
					}

					/// The status events can be grouped based on their kinds as:
					/// 1. Entering/Moving within the pool:
					/// 		- `Future`
					/// 		- `Ready`
					/// 2. Inside `Ready` queue:
					/// 		- `Broadcast`
					/// 3. Leaving the pool:
					/// 		- `InBlock`
					/// 		- `Invalid`
					/// 		- `Usurped`
					/// 		- `Dropped`
					/// 	4. Re-entering the pool:
					/// 		- `Retracted`
					/// 	5. Block finalized:
					/// 		- `Finalized`
					/// 		- `FinalityTimeout`
					///
					/// The events will always be received in the order described above, however
					/// there might be cases where transactions alternate between `Future` and `Ready`
					/// pool, and are `Broadcast` in the meantime.
					///
					/// Since `Invalid`, `Dropped` and `Retracted` might eventually comeback, we leave it
					/// for the timeout mechanic handle, as in we gave it the `timeout` window to comeback
					switch (status.type) {
						// sometimes InBlock is skipped so we need to handle both `InBlock` & `Finalized`
						case "InBlock":
						case "Finalized": {
							unsubscribe?.();
							return resolve({
								blockHash: status.isFinalized
									? status.asFinalized.toString()
									: status.asInBlock.toString(),
								extrinsicHash: txHash.toString(),
								extrinsicIndex: txIndex!,
								result,
							});

							break;
						}
						// we give up tracking the progress at this point
						case "Usurped": {
							unsubscribe?.();
							return reject(
								new Error(
									`Extrinsic ${status.type.toLowerCase()}, result=${JSON.stringify(
										result.toHuman()
									)}`
								)
							);
						}
					}
				})
				.then((unsub) => (unsubscribe = unsub))
				.catch((error) => reject(error));
		}),
		waitFor(timeout, "timeout"),
	]);

	if (result === "timeout") throw new Error("Extrinsic timeout");

	return result;
}
