import { convertHexToString, TransactionMetadata } from "xrpl";

import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import { createRelayerKeyring } from "@trncs/utils/createRelayerKeyring";
import { submitExtrinsic } from "@trncs/utils/submitExtrinsic";
import { ExtContext } from "@trncs/xls20d/commands/outbox/processXrplSide";
import { relayerSeed } from "@trncs/xls20d/config";
import { NFTStatus, Prisma, TxDeposit } from "@trncs/xls20d/prisma";
import { AccountTransaction, NFTTx } from "@trncs/xls20d/types";
import { getRootApi } from "@trncs/xls20d/utils/getRootApi";

export const signer = createRelayerKeyring(relayerSeed);

// Alice has send payment offer, for create nft offer to process
// Relayer will relay this to TRN with generateNftAcceptOffer extrinsic
export async function handlePaymentTx(
	txn: AccountTransaction & { tx: NFTTx },
	ctx: ExtContext
) {
	const { store, slack } = ctx;
	const xrplHash = txn.tx.hash!;
	const from = txn.tx.Account;
	const log = (ctx.log = ctx.log.child("PaymentTx"));
	const rootApi = await getRootApi();
	const amount = (txn.meta as TransactionMetadata)?.delivered_amount as string;
	const tokenId = convertHexToString(txn.tx.Memos![0].Memo.MemoData!);
	const tokenDetails = await store.nftOffer.findFirst({
		where: { nftId: tokenId },
	});
	if (!tokenDetails) {
		log.error(`Entry for tokenId ${tokenId} does not exist in mongodb`);
		slack.warn(
			`[XLS20D][Payment] to door account for NFTokenCreateOffer, entry for tokenId ${tokenId} does not exist in mongodb.`
		);
		return;
	}
	const { offerId, trnAddress } = tokenDetails;
	log.info(`offerId: ${offerId}`);
	log.info(`upsert TxDeposit record with xrplHash #${xrplHash}`);
	// XRPL -> TRN
	// whenever create offer for door account is made and payment is received, add new record in deposit table
	await store.txDeposit.upsert(
		createModelUpsertArgs<TxDeposit, Prisma.TxDepositUpsertArgs>(
			{
				xrplHash: xrplHash
			},
			{
				xrplHash,
				nftId: tokenId,
				to: trnAddress,
				from,
				amount,
				status: NFTStatus.OfferCreatedForDoorAccount,
			}
		)
	);
	const nftOfferId = rootApi.registry.createType("[u8; 32]", `0x${offerId}`);

	await submitExtrinsic(
		rootApi.tx.xrplBridge.generateNftAcceptOffer(nftOfferId),
		signer
	).catch((error) => {
		log.error(
			`Transaction "generateNftAcceptOffer" with offerId #${nftOfferId} failed with error "${error.message}"`
		);
	});

	log.info(
		`Submitted generateNftAcceptOffer transaction with offerId #${nftOfferId} to Root`
	);
}
