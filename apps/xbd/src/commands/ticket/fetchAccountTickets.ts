import { xrplDoorAccount } from "@trncs/xbd/config";
import { fetchAccountTickets } from "@trncs/xbd/utils/fetchAccountTickets";
import { getXrplClient } from "@trncs/xbd/utils/getXrplClient";

export const command = "fetchAccountTickets";
export const desc = `Fetch and output available tickets from "${xrplDoorAccount}"`;

export async function handler() {
	const xrplClient = await getXrplClient();

	const tickets = await fetchAccountTickets(xrplClient, xrplDoorAccount);

	console.log({ tickets }, tickets.length);

	process.exit(0);
}
