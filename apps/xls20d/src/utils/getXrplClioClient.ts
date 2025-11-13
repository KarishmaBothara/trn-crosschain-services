import { Client } from "xrpl";

import { xrplApiRippleUrl } from "@trncs/xls20d/config";

let client: Client;
export async function getXrplClioClient(): Promise<Client> {
	if (client) return client;
	client = new Client(xrplApiRippleUrl);
	await client.connect();
	console.log(`Connected to ${xrplApiRippleUrl}`);
	return client;
}
