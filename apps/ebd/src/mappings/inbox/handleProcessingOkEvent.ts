// import { utils } from "ethers";
import {
	ExtContext,
	ProcessingOkArgsV54,
	ProcessingOkItem,
} from "@trncs/ebd/commands/inbox/processRootSide";
import { inboxRelayerSeed } from "@trncs/ebd/config";
import { TxStatus } from "@trncs/ebd/prisma";
import { getEthersProvider } from "@trncs/ebd/utils/getEthersProvider";
import { getRootApi } from "@trncs/ebd/utils/getRootApi";
import { checkRootXRPBalance } from "@trncs/utils/checkRootXRPBalance";
import { minXRPInWallet } from "@trncs/utils/config";
import { createRelayerKeyring } from "@trncs/utils/createRelayerKeyring";

const signer = createRelayerKeyring(inboxRelayerSeed);

export async function handleProcessingOkEvent(
	ctx: ExtContext,
	_item: ProcessingOkItem,
	args: ProcessingOkArgsV54
): Promise<void> {
	const { store, slack } = ctx;
	const messageId =
		typeof args === "bigint"
			? Number(args)
			: Number((args as ProcessingOkArgsV54).eventClaimId);
	const record = await store.txDeposit.findFirst({ where: { messageId } });
	const log = (ctx.log = ctx.log.child("ProcessingOk"));
	const rootApi = await getRootApi();

	log.info(`start with messageId #${messageId}`);

	if (!record) {
		log.warn(`TxDeposit record with messageId #${messageId} is not found`);
		log.info("skipped");
		return;
	}

	let from = record.from;
	if (from === "0x") {
		const ethHash = record.ethHash;
		const provider = getEthersProvider();
		const receipt = (await provider.getTransactionReceipt(ethHash)) ?? {
			from: "0x",
		};

		from = receipt.from;
		log.info({ from }, `Attempted to fetch the "from" field for "${ethHash}"`);
		slack.info(
			`ProcessingOk: Attempted to fetch the "from" field for "${ethHash}": ${from}`
		);
	}

	const data = { status: TxStatus.ProcessingOk, from };

	log.info(`update TxDeposit record with messageId #${messageId}`);
	store.$push(
		store.txDeposit.update({
			where: { messageId },
			data,
		})
	);

	// if (record.messageFee) {
	//
	// WARN: there is a bug in `getAirdropAmount` that causes 2 XRP transferred
	// even the message fee is just slighly greater than the base bridge fee,
	// e.g `300000000000002`
	// 	const amount = await getAirdropAmount(record.messageFee);
	// 	if (amount) {
	// 		log.info(`airdrop ${amount} XRP to "${record.to}"`);
	// 		await submitExtrinsic(
	// 			rootApi.tx.assets.transfer(
	// 				2,
	// 				record.to,
	// 				utils.parseUnits(amount.toString(), 6).toString()
	// 			),
	// 			signer
	// 		);
	// 	}
	// }

	const [sufficient, currentAmount] = await checkRootXRPBalance(
		rootApi,
		signer.address
	);
	if (!sufficient) {
		slack.warn(
			`Relayer account \`${signer.address}\` XRP balance on TRN is lower than \`${minXRPInWallet} XRP\`, current balance is \`${currentAmount} XRP\`.`
		);
	}

	log.info(`done`);
}
