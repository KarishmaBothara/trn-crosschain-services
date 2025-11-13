import { AccountObjectsResponse, Client } from "xrpl";
import { Ticket } from "xrpl/dist/npm/models/ledger";

export async function fetchAccountTickets(client: Client, account: string) {
	let lastMarker: AccountObjectsResponse["result"]["marker"];
	const tickets: number[] = [];
	do {
		const query = await client.request({
			command: "account_objects",
			account,
			type: "ticket",
			marker: lastMarker,
		});

		query.result.account_objects.forEach((object) =>
			tickets.push((object as Ticket).TicketSequence)
		);

		lastMarker = query.result.marker;
	} while (lastMarker);

	return tickets.sort();
}
