import { Client, convertStringToHex, Wallet } from "xrpl";

export async function burnUnusedTickets(
	client: Client,
	wallet: Wallet,
	allTickets: number[],
	currentSequence: number
) {
	const unusedTickets = allTickets.filter((ticket) => ticket < currentSequence);
	for (const ticket of unusedTickets) {
		console.log(`Ticket Sequence: ${ticket}`);
		const tx = await client.autofill({
			Account: wallet.address,
			TransactionType: "AccountSet",
			Domain: convertStringToHex("futureverse.com"),
			TicketSequence: ticket,
			LastLedgerSequence: undefined, // Never expire this transaction.
			Sequence: 0,
		});
		await client.submitAndWait(tx, { wallet });
	}

	return unusedTickets;
}
