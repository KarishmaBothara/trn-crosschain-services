import { ApiPromise } from "@polkadot/api";
import { stringToU8a } from "@polkadot/util";

import { MintRequest } from "@trncs/xls20d/types";

export interface CollectionTokenMap {
	collectionId?: string;
	tokenMappings: (number | Uint8Array)[];
}
export async function extractCollectionMap(
	mintRequests: MintRequest[],
	rootApi: ApiPromise
) {
	const collectionItems: CollectionTokenMap[] = [];
	// Check if any of the request is already fulfilled on root network
	await Promise.all(
		mintRequests.map(async (details) => {
			const { tokenId, collectionId, serialId } = details;
			if (!collectionId || !serialId) return;
			const mapExist = await rootApi.query.xls20.xls20TokenMap(
				collectionId,
				serialId
			);
			console.log("map exists::", mapExist.toJSON());
			if (mapExist.toJSON() !== null) return;
			const u8a = stringToU8a(tokenId);
			const tkn = [parseInt(serialId), u8a];
			collectionItems.push({ collectionId, tokenMappings: tkn });
		})
	);
	return collectionItems;
}
