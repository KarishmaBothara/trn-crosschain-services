import { Argv } from "yargs";

import { trnHttpEndpoints } from "@trncs/ebd/config";
import { fetchEventProof } from "@trncs/utils/fetchProofFromEndpoint";

export const command = "fetchEventProof";
export const desc = "Fetch an event proof from EthBridge";

export async function builder(instance: Argv) {
	return instance.option("eventProofId", {
		alias: "e",
		demandOption: true,
		type: "number",
	});
}

export async function handler(argv: { eventProofId: string }) {
	const { eventProofId } = argv;

	const eventProof = await fetchEventProof(
		eventProofId,
		trnHttpEndpoints,
		"ethy_getEventProof"
	);

	console.log("eventProof", eventProof);
	console.log("validators", JSON.stringify(eventProof.validators));
	process.exit(0);
}
