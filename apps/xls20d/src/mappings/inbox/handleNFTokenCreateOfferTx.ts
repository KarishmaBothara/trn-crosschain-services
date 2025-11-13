import { Logger } from "@subsquid/logger";

import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import { slack } from "@trncs/xls20d/commands/outbox/processXrplSide";
import { NftOffer, Prisma } from "@trncs/xls20d/prisma";
import { AccountTransaction, NFTTx } from "@trncs/xls20d/types";
import { checkIfNonBurnableNft } from "@trncs/xls20d/utils/checkIfNonBurnableNft";
import { Store } from "@trncs/xls20d/utils/createMongoDatabase";
import { fetchOfferDetails } from "@trncs/xls20d/utils/fetchOfferId";

// When Alice creates offer for door account, add details in mongo db
export async function handleNFTokenCreateOfferTx(
	txn: AccountTransaction & { tx: NFTTx },
	store: Store,
	log: Logger
) {
	const offerDetails = fetchOfferDetails(txn);
	if (offerDetails === null) {
		log.info(`Skip, as NFTokenCreateOffer does not have right memo data format ${txn.tx}`);
		return;
	}
	const { nftId, offerId, recipient } = offerDetails;
	log.info(`nftId::${nftId}`);

	const isValidTx = await checkIfNonBurnableNft(nftId);
	if (!isValidTx) {
		log.info(
			`NFT token offer created on token ${nftId} which is burnable`
		);
		slack.warn(
			`NFT token offer created on token ${nftId} which is burnable`
		);
		return;
	}
	const record = await store.nftOffer.upsert(
		createModelUpsertArgs<NftOffer, Prisma.NftOfferUpsertArgs>(
			{ nftId: nftId },
			{
				offerId: offerId,
				nftId: nftId,
				trnAddress: recipient,
			}
		)
	);
	log.info(`Create offer data saved with nftId "${record.nftId}"`);
}
