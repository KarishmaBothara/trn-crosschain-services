// Check if relayer account has enough balance
import assert from "assert";
import { Client, Wallet } from "xrpl";

export async function checkXrpBalance(
	wallet: Wallet,
	client: Client,
	noOfTxs: number
) {
	const costOfTx = 12; // drops
	const totalCostInDrops = noOfTxs * costOfTx;
	const response = await client.request({
		command: "account_info",
		account: wallet.address,
		ledger_index: "current",
		queue: true,
	});
	const balance = response.result.account_data.Balance;
	console.log(`XRP balance before ${balance}`);
	// add 1000 drop as buffer for ticket creation transaction
	assert(
		totalCostInDrops < parseInt(balance) + 1000,
		`Dont have enough xrp balance on xrpl chain for address ${wallet.address}`
	);
}
