import { NFTokenAcceptOffer } from "xrpl/dist/npm/models/transactions/NFTokenAcceptOffer";

import { submitExtrinsic } from "@trncs/utils/submitExtrinsic";
import { ExtContext } from "@trncs/xls20d/commands/outbox/processXrplSide";
import { signer } from "@trncs/xls20d/mappings/inbox/handlePaymentTx";
import { NFTStatus } from "@trncs/xls20d/prisma";
import { MintTransaction } from "@trncs/xls20d/types";
import { getRootApi } from "@trncs/xls20d/utils/getRootApi";

// When door account accepts offer for a create offer, relayer sends an extrinsic submitTransaction
// for nft to be sent to destination on TRN side
export async function handleNFTokenAcceptOfferTx(
	txn: MintTransaction,
	ctx: ExtContext
) {
	const { store, log, slack } = ctx;
	const sellOfferId = (txn.tx as NFTokenAcceptOffer).NFTokenSellOffer;
	const tokenId = (txn.meta as any).nftoken_id;
	const xrplHash = txn.tx.hash!;
	const ledgerIndex = txn.tx.ledger_index;
	const rootApi = await getRootApi();
	const tokenDetails = await store.nftOffer.findFirst({
		where: { nftId: tokenId },
	});
	if (!tokenDetails) {
		log.error(`Entry for tokenId ${tokenId} does not exist in mongodb`);
		slack.warn(
			`[XLS20D][NFTokenAcceptOffer] to door account for NFTokenCreateOffer, entry for tokenId ${tokenId} does not exist in mongodb.`
		);
		return;
	}
	const { offerId, trnAddress } = tokenDetails;
	log.info(`offerId: ${offerId}`);
	if (sellOfferId !== offerId) {
		log.error(
			`DB entry for tokenId ${tokenId} has offerId ${offerId}, expected offerId ${sellOfferId}`
		);
		slack.warn(
			`DB entry for tokenId ${tokenId} has offerId ${offerId}, expected offerId ${sellOfferId}`
		);
	}
	log.info(`upsert TxDeposit record with xrplHash #${xrplHash}`);
	/// XRPL -> TRN, when door account accepts offer is emitted on xrpl side, ensure entry exist in DB
	const record = await store.txDeposit.findFirst({
		where: {
			nftId: tokenId,
			status: NFTStatus.OfferAcceptedByDoorAccount,
			xrplHash: xrplHash
		}
	});
	if (!record) {
		log.warn(`No record for nft accept offer exist for nftId: ${tokenId}`);
	}
	log.info(
		`Sending submitTransaction extrinsic to the trn when nft token accept offer is executed by door account ${tokenId}`
	);
	const txData = rootApi.createType("XRPLTxData", {
		Xls20: {
			tokenId: `0x${tokenId}`,
			address: trnAddress,
		},
	});
	log.info(`txData:${JSON.stringify(txData)}`);

	await submitExtrinsic(
		rootApi.tx.xrplBridge.submitTransaction(
			ledgerIndex,
			xrplHash,
			txData,
			new Date().getTime()
		),
		signer
	).catch((error) => {
		log.error(
			`Sending submitTransaction extrinsic to the trn with xrplHash #${xrplHash} failed with error "${error.message}"`
		);
	});

	log.info(`Done submitting xls20 txs on trn`);
}
