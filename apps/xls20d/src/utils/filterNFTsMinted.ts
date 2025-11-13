import { convertHexToString, NFTokenMint } from "xrpl";

import { getXrplClient } from "@trncs/xls20d/utils/getXrplClient";

export async function filterSerialNumberMinted(
	collectionId: number,
	uris: string[],
	serialNumbers: number[],
	xrplMinterAccount: string,
	ledgerIndex: number
) {
	const serialNumbersFiltered = [];
	const tokenURIFiltered = [];
	const nfts = await getAllNFTS(xrplMinterAccount, ledgerIndex);
	console.log("Total nfts in account::", nfts?.length);
	for (let i = 0; i < uris.length; i++) {
		const nftExist = nfts && nfts.includes(uris[i]);

		if (!nftExist) {
			serialNumbersFiltered.push(serialNumbers[i]);
			tokenURIFiltered.push(uris[i]);
		}
	}
	return { serialNumbersFiltered, tokenURIFiltered };
}

export async function getAllNFTS(
	xrplMinterAccount: string,
	ledgerIndex: number
): Promise<string[] | undefined> {
	const client = await getXrplClient();
	let txns;
	let query = await client.request({
		command: "account_tx",
		account: xrplMinterAccount,
		ledger_index_min: ledgerIndex,
		ledger_index_max: -1,
		binary: false,
		limit: 100,
		forward: true,
	});
	txns = query.result.transactions;

	while (query.result.marker) {
		query = await client.request({
			command: "account_tx",
			account: xrplMinterAccount,
			ledger_index_min: ledgerIndex,
			ledger_index_max: -1,
			binary: false,
			limit: 300,
			forward: true,
			marker: query.result.marker,
		});

		const {
			result: { transactions },
		} = query;
		txns = [...txns, ...transactions];
	}
	const nftTxs = txns
		.filter((tx) => tx?.tx?.TransactionType === "NFTokenMint")
		.map((tx) => convertHexToString((tx.tx as NFTokenMint).URI as string));
	return nftTxs;
}
