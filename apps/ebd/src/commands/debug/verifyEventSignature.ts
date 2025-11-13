import { utils } from "ethers";
import { Argv } from "yargs";

import { ObxAuthSet, TxAuthSetChange, TxWithdrawal } from "@trncs/ebd/prisma";
import { getPrismaClient } from "@trncs/ebd/utils/getPrismaClient";

export const command = "verifyEventSignature";
export const desc =
	"Use similar verification process on Bridge contract to verify the event signature";

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
			default: "AuthSetChange",
		});
}

export async function handler(argv: {
	eventId: number;
	record: "Withdrawal" | "AuthSetChange";
}) {
	const prisma = await getPrismaClient();
	const { eventId, record: recordType } = argv;

	const event = await (async () => {
		const txRecord: TxWithdrawal | TxAuthSetChange | null =
			recordType === "Withdrawal"
				? await prisma.txWithdrawal.findFirst({ where: { eventId } })
				: await prisma.txAuthSetChange.findFirst({ where: { eventId } });

		if (!txRecord)
			return console.warn(
				`${txRecord} record with event #${eventId} not found`
			);

		const authSet = await prisma.obxAuthSet.findFirst({
			where: { setId: txRecord.eventAuthSetId },
		});

		if (!authSet) {
			return console.warn(
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
	const {
		eventAuthSet,
		eventAuthSetId,
		eventSignature,
		eventInfo: { source, destination, message },
	} = event;
	const preimage = utils.defaultAbiCoder.encode(
		["address", "address", "bytes", "uint32", "uint256"],
		[source, destination, message, eventAuthSetId, eventId]
	);
	const digest = utils.keccak256(preimage);

	const output = eventAuthSet.map((validator, index) => {
		const hasSignature =
			eventSignature.r[index] !==
			"0x0000000000000000000000000000000000000000000000000000000000000000";
		const item: {
			validator: string;
			recovered: string | null;
			matched: boolean | null;
		} = {
			validator,
			recovered: hasSignature
				? utils.recoverAddress(digest, {
						r: eventSignature.r[index],
						s: eventSignature.s[index],
						v: eventSignature.v[index],
				  })
				: null,
			matched: null,
		};

		item.matched = hasSignature
			? item.validator?.toLowerCase() === item.recovered?.toLowerCase()
			: null;

		return item;
	});

	console.table(output);
}
