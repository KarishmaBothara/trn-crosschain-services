import { ECDSASignature } from "../prisma";

interface EventProof {
	eventId: number;
	validatorSetId: number;
	validators: string[];
	r: string[];
	s: string[];
	v: number[];
}

export function formatBridgeEventProof(
	eventId: number,
	validatorSetId: number,
	validators: string[],
	signature: ECDSASignature
): EventProof {
	return {
		eventId,
		validatorSetId,
		validators,
		...signature,
	};
}
