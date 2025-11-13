import axios from "axios";
import { waitFor } from "@trncs/utils/waitFor";

export async function fetchFromEndPoint(
	appArchive: string,
	eventId: string | number,
	method: string
) {
	const httpResult = await axios.post(appArchive, {
		id: 1,
		jsonrpc: "2.0",
		method: method,
		params: [eventId],
	});
	return httpResult?.data?.result;
}

export async function fetchEventProof(
	eventId: string | number,
	endpoints: string[],
	method: string
) {
	for (const endpoint of endpoints) {
		try {
			const eventProof = await fetchFromEndPoint(endpoint, eventId, method);
			if (eventProof) {
				return eventProof;
			}
		} catch (error) {
			console.error(`Error fetching event proof from ${endpoint}:`, error);
		}
		// wait for a min before fetching for the proof to be ready
		await waitFor(60000);
	}
	throw new Error(`Event proof #${eventId} not found`);
}
