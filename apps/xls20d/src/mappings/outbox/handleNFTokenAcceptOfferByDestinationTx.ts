import { Logger } from "@subsquid/logger";

import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import { NFTStatus, Prisma, TxWithdrawal } from "@trncs/xls20d/prisma";
import { MintTransaction } from "@trncs/xls20d/types";
import { Store } from "@trncs/xls20d/utils/createMongoDatabase";

// Unlike token bridging, when payment is done - it is always recieved by destination
// for nft bridging, unless destination accepts offer, the process is not done (TRN->XRPL)
export async function handleNFTokenAcceptOfferByDestinationTx(
	txn: MintTransaction,
	store: Store,
	log: Logger
) {
	const tokenId = (txn.meta as any).nftoken_id;
	const xrplHash = txn.tx.hash!;
	log.info(`upsert TxWithdrawal record with tokenId #${tokenId}`);
	// TRN -> XRPL, when offer is accepted by dest
	// Get record for offer created by door account record for this nft and update the status to offer accepted by dest account
	// with new xrpl hash at which it is accepted
	const record = await store.txWithdrawal.findFirst({
		where: {
			nftId: tokenId,
			status: NFTStatus.OfferCreatedByDoorAccount
		}
	});
	if (record) {
		await store.txWithdrawal.upsert(
			createModelUpsertArgs<TxWithdrawal, Prisma.TxWithdrawalUpsertArgs>(
				{
					id: record.id,
				},
				{
					nftId: tokenId,
					status: NFTStatus.OfferAcceptedByDestAccount,
					xrplHash: xrplHash,
				}
			)
		);
	}
}
