import {
	ExtContext,
	ProcessingOkArgs,
	ProcessingOkItem,
} from "@trncs/xls20d/commands/inbox/processRootSide";
import { NFTStatus } from "@trncs/xls20d/prisma";
import { getRootApi } from "@trncs/xls20d/utils/getRootApi";
import { EventRecord } from "@polkadot/types/interfaces";

export async function handleProcessingOkEvent(
	ctx: ExtContext,
	item: ProcessingOkItem,
	args: ProcessingOkArgs
): Promise<void> {
	const { store } = ctx;
	const xrplHash = args[1].toString();
	const log = (ctx.log = ctx.log.child("ProcessingOk"));

	log.info(`start with xrplHash #${xrplHash}`);
	const record = await store.txDeposit.findFirst({ where: { xrplHash } });
	if (!record) {
		log.warn(`TxDeposit record with xrplHash #${xrplHash} is not found`);
		log.info("skipped");
		return;
	}

	const blockHeight = item.header.height;
	const rootApi = await getRootApi();
	const blockHash = await rootApi.rpc.chain.getBlockHash(blockHeight);
	const events: EventRecord[] = await rootApi.query.system.events.at(blockHash);
	let colId: string | null = null, seriesId: number[] | null = [];
	// Look for nft BridgedMint event and collectionid and series id field is updated.
	// BridgedMint {
	// 			collection_id,
	// 			serialNumbers[],
	// 			owner,
	// 			}
	const event = events.find(
		(event) =>
			event.event.section === "nft" &&
			event.event.method === "BridgedMint" &&
			event.event.data[2].toString().toLowerCase() === record?.to?.toLowerCase()
	);
	if (event) {
		colId = event.event?.data[0]?.toString();
		seriesId = event.event?.data[1]?.toJSON() as number[];
	}

	log.info(`update TxDeposit record with xrplHash #${xrplHash}`);
	const data = {
		status: NFTStatus.ProcessingOk,
		colId: colId,
		seriesIds: seriesId
	};

	await store.txDeposit.update({
			where: { xrplHash },
		data
	});

	log.info(`done`);
}
