import { LedgerEntryResponse } from "xrpl";

import { getXrplClient } from "@trncs/xls20d/utils/getXrplClient";

export async function getCurrentLedgerIndex(): Promise<number> {
	const client = await getXrplClient();
	const currentLedger = await client.request({
		method: "ledger_current",
		params: [{}],
	} as any);
	return (currentLedger as LedgerEntryResponse).result.ledger_current_index;
}
