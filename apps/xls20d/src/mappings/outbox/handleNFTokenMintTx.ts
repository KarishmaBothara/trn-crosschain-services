import { Logger } from "@subsquid/logger";
import { convertHexToString } from "xrpl";
import { Memo } from "xrpl/dist/npm/models/common";

import { checkRootXRPBalance } from "@trncs/utils/checkRootXRPBalance";
import { minXRPInWallet } from "@trncs/utils/config";
import { createRelayerKeyring } from "@trncs/utils/createRelayerKeyring";
import { submitExtrinsic } from "@trncs/utils/submitExtrinsic";
import { ExtContext } from "@trncs/xls20d/commands/outbox/processXrplSide";
import { relayerSeed } from "@trncs/xls20d/config";
import { TxStatus } from "@trncs/xls20d/prisma";
import { MintRequest, MintTransaction } from "@trncs/xls20d/types";
import { fetchTokenId } from "@trncs/xls20d/utils/fetchTokenId";
import { getRootApi } from "@trncs/xls20d/utils/getRootApi";

export function handleNFTokenMintTx(
	txn: MintTransaction,
	log: Logger
): MintRequest | undefined {
	const tokenId = fetchTokenId(txn);
	const {
		tx: { Memos, hash },
	} = txn;
	if (!tokenId) return;
	const memoDataHex = (Memos as unknown as Memo[])[0].Memo.MemoData;
	const memoData = convertHexToString(memoDataHex as string);
	const [collectionId, serialId] = memoData.split("_");
	if (!collectionId || !serialId) return;
	log.info(
		`Add token mint details tokenId: ${tokenId} & requestSequence: ${memoData}`
	);
	return { tokenId, collectionId, serialId, hash: hash as string };
}

// fullfill mint request on root network
export async function fulfillMintRequests(
	ctx: ExtContext,
	mintRequests: MintRequest[]
): Promise<void> {
	const { log, store, slack } = ctx;
	log.info(`mintRequests: ${JSON.stringify(mintRequests)}`);
	const rootApi = await getRootApi();
	const collectionMap = new Map();
	// Check if any of the request is already fulfilled on root network
	await Promise.all(
		mintRequests.map(async (details) => {
			const { tokenId, collectionId, serialId } = details;
			if (!collectionId || !serialId) return;
			console.log("collection id::", collectionId);
			const mapExist = await rootApi.query.xls20.xls20TokenMap(
				collectionId,
				serialId
			);
			console.log("map exists::", mapExist.toJSON());
			if (mapExist.toJSON() !== null) return;
			let tokenMap = [];
			if (collectionMap.has(collectionId)) {
				tokenMap = collectionMap.get(collectionId);
			}
			const tkn = [parseInt(serialId), `0x${tokenId}`];
			tokenMap.push(tkn);
			collectionMap.set(collectionId, tokenMap);
		})
	);

	if (!collectionMap.size) return;
	const signer = createRelayerKeyring(relayerSeed);
	const txs = [];
	for (const [collectionId, tokenMap] of collectionMap) {
		log.info(collectionId + ":" + tokenMap);
		log.info(tokenMap);
		if (tokenMap && tokenMap.length) {
			const tx = rootApi.tx.xls20.fulfillXls20Mint(collectionId, tokenMap);
			txs.push(tx);
		}
	}
	let status: TxStatus;
	try {
		const response = await submitExtrinsic(
			rootApi.tx.utility.batchAll(txs),
			signer
		);
		log.info(`fullfillTx: ${JSON.stringify(response)}`);
		if (response.blockHash) {
			status = TxStatus.ProcessingFulfillOk;
		}
		const [sufficient, currentAmount] = await checkRootXRPBalance(
			rootApi,
			signer.address
		);
		if (!sufficient) {
			slack.warn(
				`Relayer account \`${signer.address}\` XRP balance on TRN is lower than \`${minXRPInWallet} XRP\`, current balance is \`${currentAmount} XRP\`.`
			);
		}
	} catch (e) {
		log.error(`Error:: e`);
		status = TxStatus.ProcessingFulfillFailed;
	}
	await Promise.all(
		mintRequests.map(async (details) => {
			const { collectionId, serialId } = details;
			const requestNonce = `${collectionId}_${serialId}`;
			const data = { status: status };
			await store.xRPLMintedToken.update({
				where: { requestNonce },
				data,
			});
		})
	);
}
