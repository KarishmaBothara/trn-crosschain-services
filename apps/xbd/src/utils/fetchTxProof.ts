import assert from "assert";
import hashjs from "hash.js";
import { encodeAccountID } from "xrpl";

import { fetchEventProof } from "@trncs/utils/fetchProofFromEndpoint";

export interface Signer {
	Signer: {
		SigningPubKey: string;
		TxnSignature: string;
		Account: string;
	};
}

export interface TxProof {
	asRaw: {
		signatures: string[];
		validators: string[];
	};

	asSigners: Signer[];
}

export async function fetchTxProof(
	endpoints: string[],
	eventId: number
): Promise<TxProof> {
	const asRaw = (await fetchEventProof(
		eventId,
		endpoints,
		"ethy_getXrplTxProof"
	)) as TxProof["asRaw"];
	assert(
		!!asRaw && !!Object.keys(asRaw).length,
		`Proof for event #${eventId} not found`
	);

	const asSigners = asRaw.signatures.map((sig, idx) => {
		const validator = asRaw.validators[idx].substring(2);

		return {
			Signer: {
				SigningPubKey: validator,
				Account: encodeXrplAccount(Buffer.from(validator, "hex")),
				TxnSignature: sig.substring(2),
			},
		};
	}) as TxProof["asSigners"];

	return { asRaw, asSigners };
}

function encodeXrplAccount(publicKey: Buffer): string {
	const hash256 = hashjs.sha256().update(publicKey).digest();
	const hash160 = hashjs.ripemd160().update(hash256).digest();
	return encodeAccountID(Buffer.from(hash160));
}
