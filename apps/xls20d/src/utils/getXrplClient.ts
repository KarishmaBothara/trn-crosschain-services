import { Client } from "xrpl";

import { xrplApiUrl } from "@trncs/xls20d/config";

let client: Client;
export async function getXrplClient(): Promise<Client> {
	if (client) return client;
	client = new Client(xrplApiUrl);
	await client.connect();
	return client;
}
