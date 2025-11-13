import { Client } from "xrpl";

import { xrplMinterAccount } from "@trncs/xls20d/config";

export async function getSequenceForMinterAccount(xrplClient: Client) {
	const response = await xrplClient.request({
		command: "account_info",
		account: xrplMinterAccount,
		ledger_index: "validated",
	});
	return response.result.account_data.Sequence;
}
