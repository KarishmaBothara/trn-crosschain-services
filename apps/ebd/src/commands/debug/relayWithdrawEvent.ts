import { createLogger } from "@subsquid/logger";
import { Argv } from "yargs";

import { bridgeContractAddress } from "@trncs/ebd/config";
import { ObxAuthSet, TxAuthSetChange, TxWithdrawal } from "@trncs/ebd/prisma";
import { callBridgeContract } from "@trncs/ebd/utils/callBridgeContract";
import { formatBridgeEventProof } from "@trncs/ebd/utils/formatBridgeEventProof";
import { getPrismaClient } from "@trncs/ebd/utils/getPrismaClient";

export const command = "relayWithdrawEvent";
export const desc = "Relay an event from DB to Bridge contract";

const log = createLogger("debug");

export async function builder(instance: Argv) {
	return instance
		.option("eventId", {
			alias: "e",
			demandOption: true,
			type: "number",
		})
		.option("record", {
			alias: "r",
			demandOption: true,
			choices: ["Withdrawal", "AuthSetChange"],
			type: "string",
		});
}

export async function handler(argv: {
	eventId: number;
	record: "Withdrawal" | "AuthSetChange";
}) {
	const prisma = await getPrismaClient();
	const { eventId, record: recordType } = argv;

	const localLog = log.child(`#${eventId}`);

	const event = await (async () => {
		const txRecord: TxWithdrawal | TxAuthSetChange | null =
			recordType === "Withdrawal"
				? await prisma.txWithdrawal.findFirst({ where: { eventId } })
				: await prisma.txAuthSetChange.findFirst({ where: { eventId } });

		if (!txRecord)
			return localLog.warn(
				`${txRecord} record with event #${eventId} not found`
			);

		const authSet = await prisma.obxAuthSet.findFirst({
			where: { setId: txRecord.eventAuthSetId },
		});

		if (!authSet) {
			return localLog.warn(
				`AuthSet record with setId #${txRecord.eventAuthSetId} not found`
			);
		}

		return {
			eventInfo: txRecord.eventInfo,
			eventSignature: txRecord.eventSignature,
			eventAuthSetId: txRecord.eventAuthSetId,
			eventAuthSet: authSet.setValue,
		} as Pick<
			typeof txRecord,
			"eventInfo" | "eventSignature" | "eventAuthSetId"
		> & { eventAuthSet: ObxAuthSet["setValue"] };
	})();

	if (!event) return;
	localLog.info(
		`Relay the event to the bridge contract "${bridgeContractAddress}"`
	);
	const {
		eventAuthSet,
		eventAuthSetId,
		eventSignature,
		eventInfo: { source, destination, message },
	} = event;

	const eventProof = formatBridgeEventProof(
		eventId,
		eventAuthSetId,
		eventAuthSet,
		eventSignature
	);

	localLog.info(eventProof);

	const tx = await callBridgeContract(
		"receiveMessage",
		[source, destination, message, eventProof],
		recordType === "Withdrawal"
	);

	const receipt = await tx.wait();
	localLog.info(
		`done with status: ${receipt.status}, hash: ${receipt.transactionHash}, at: ${receipt.blockNumber}`
	);
	process.exit(0);
}
