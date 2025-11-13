import { Client, convertStringToHex } from "xrpl";
import { NFTokenMint } from "xrpl/dist/npm/models/transactions/NFTokenMint";

import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import { ExtContext } from "@trncs/xls20d/commands/outbox/processRootSide";
import { MintRequestedArgs } from "@trncs/xls20d/commands/outbox/processRootSide";
import { Prisma, TxStatus, XRPLMintedToken } from "@trncs/xls20d/prisma";
import { Store } from "@trncs/xls20d/utils/createMongoDatabase";
import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/xls20d/utils/createSlackLogger";
import { getXrplClient } from "@trncs/xls20d/utils/getXrplClient";
import { fetchXRPLWallet } from "@trncs/xls20d/utils/isJENCollection";

const slack = createSlackLogger(LoggerChannel.Incoming, LoggerChild.Xrpl);

export async function handleXls20MintRequestEvent(
	collectionId: number,
	serialNumbers: number[],
	tokenUris: string[],
	ctx: ExtContext,
	index: number
) {
	const { log } = ctx;
	console.log("Inside handle mint request events...", collectionId);
	for (let i = 0; i < serialNumbers.length; i++) {
		log.info(`Received serial number ${serialNumbers[i]}`);
		log.info(`Received tokenUri:: ${tokenUris[i]}`);
		// handle individual event
		await handleIndividualRequest(
			{ ...ctx, slack, index },
			{
				collectionId: collectionId,
				serialNumber: serialNumbers[i],
				tokenUri: tokenUris[i],
			}
		);
	}
}

// Check mongodb has entry for this request nonce which is collectionId_serialNumber
async function checkNFTExist(store: Store, requestNonce: string) {
	const nftExist = await store.xRPLMintedToken.findUnique({
		where: { requestNonce: requestNonce },
	});
	return nftExist;
}

export async function handleIndividualRequest(
	ctx: ExtContext,
	args: MintRequestedArgs
): Promise<void> {
	const { store } = ctx;
	const { log } = ctx;
	const xrplClient = await getXrplClient();

	const { collectionId, serialNumber, tokenUri } = args;

	let status: TxStatus | string = "<unset>";
	const requestNonce = `${collectionId}_${serialNumber}`;
	const nftAlreadyMinted = await checkNFTExist(store, requestNonce);
	if (nftAlreadyMinted) return; // do nothing if token is already minted

	const record = await store.xRPLMintedToken.upsert(
		createModelUpsertArgs<XRPLMintedToken, Prisma.XRPLMintedTokenUpsertArgs>(
			{ requestNonce: requestNonce },
			{
				requestNonce: requestNonce,
				tokenUri: tokenUri,
				collectionId: collectionId,
				status: TxStatus.Processing,
			}
		)
	);

	status = record.status as TxStatus;
	status = await mintNFT(
		xrplClient,
		tokenUri,
		collectionId,
		requestNonce,
		store
	);
	log.info(`done with "${status} for #${tokenUri}"`);
}

// Mint NFT on XRPL network storing request nonce in memo field
async function mintNFT(
	client: Client,
	uri: string,
	collectionId: number,
	requestNonce: string,
	store: Store
) {
	const wallet = fetchXRPLWallet(collectionId);
	const hexURI = convertStringToHex(uri);
	const mintToken: NFTokenMint = {
		TransactionType: "NFTokenMint",
		Account: wallet.address,
		TransferFee: 0,
		NFTokenTaxon: collectionId,
		Flags: 8, // Transferable
		URI: hexURI,
		SourceTag: 38887387,
		Fee: "10",
		Memos: [
			{
				Memo: {
					MemoType: convertStringToHex("RequestNonce"),
					MemoData: convertStringToHex(requestNonce.toString()),
				},
			},
		],
	};

	const mintTokenTx = await client.autofill(mintToken);
	const response = await client.submit(mintTokenTx, { wallet: wallet });
	const status = TxStatus.Processing;
	const {
		result: {
			tx_json: { hash },
		},
	} = response;

	const data = { status, xrplHash: hash };
	const mintNFT = await store.xRPLMintedToken.update({
		where: { requestNonce },
		data,
	});
	console.log(`done with status "${mintNFT.status}"`);
	return status;
}
