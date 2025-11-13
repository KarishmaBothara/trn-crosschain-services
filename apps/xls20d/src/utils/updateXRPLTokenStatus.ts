import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import { Prisma, TxStatus, XRPLMintedToken } from "@trncs/xls20d/prisma";
import { MintRequest } from "@trncs/xls20d/types";
import { Store } from "@trncs/xls20d/utils/createMongoDatabase";

export async function updateXRPLTokenStatusInList(
	mintRequests: MintRequest[],
	status: TxStatus,
	blockHash: string,
	store: Store
) {
	await Promise.all(
		mintRequests.map(async (details) => {
			const { collectionId, serialId } = details;
			const requestNonce = `${collectionId}_${serialId}`;
			await updateXRPLTokenData(
				requestNonce,
				details,
				status,
				blockHash,
				store
			);
		})
	);
}

export async function updateXRPLTokenData(
	requestNonce: string,
	data: MintRequest,
	status: TxStatus,
	blockHash: string,
	store: Store
) {
	const { collectionId, tokenUri } = data;
	const xrplHash = data.hash;
	await store.xRPLMintedToken.upsert(
		createModelUpsertArgs<XRPLMintedToken, Prisma.XRPLMintedTokenUpsertArgs>(
			{ requestNonce },
			{
				collectionId: parseInt(collectionId as string),
				tokenUri: tokenUri,
				requestNonce: requestNonce,
				rootHash: blockHash,
				status: status,
				xrplHash,
			}
		)
	);
}
