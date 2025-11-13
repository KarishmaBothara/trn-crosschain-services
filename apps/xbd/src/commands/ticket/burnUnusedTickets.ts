import { Wallet } from "xrpl";

import { xrplDoorAccount, xrplDoorSeed } from "@trncs/xbd/config";
import { burnUnusedTickets } from "@trncs/xbd/utils/burnUnusedTickets";
import { fetchAccountTickets } from "@trncs/xbd/utils/fetchAccountTickets";
import { getRootApi } from "@trncs/xbd/utils/getRootApi";
import { getXrplClient } from "@trncs/xbd/utils/getXrplClient";

export const command = "burnUnusedTickets";
export const desc = `Burn unused tickets on "${xrplDoorAccount}" by sending the same "AccountSet" method`;
export async function handler() {
	const [rootApi, xrplClient] = await Promise.all([
		getRootApi(),
		getXrplClient(),
	]);

	const wallet = Wallet.fromSeed(xrplDoorSeed);
	const tickets = await fetchAccountTickets(xrplClient, wallet.address);
	const currentSequence = await rootApi.query.xrplBridge.doorTicketSequence();
	const burntTickets = await burnUnusedTickets(
		xrplClient,
		wallet,
		tickets,
		currentSequence.toJSON() as number
	);

	console.log({ unusedTickets: burntTickets }, burntTickets.length);
	process.exit(0);
}
