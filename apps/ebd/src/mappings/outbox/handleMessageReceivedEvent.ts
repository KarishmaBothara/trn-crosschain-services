import {
	ExtContext,
	MessageReceivedArgs,
	MessageReceivedEvent,
} from "@trncs/ebd/commands/outbox/processEthSide";
import { pegPalletAddress } from "@trncs/ebd/config";
import { TxStatus } from "@trncs/ebd/prisma";

export async function handleMessageReceivedEvent(
	ctx: ExtContext,
	event: MessageReceivedEvent,
	args: MessageReceivedArgs
): Promise<void> {
	const { store } = ctx;
	const ethHash = event.transactionHash;
	const log = (ctx.log = ctx.log.child("MessageReceived"));

	log.info(`start with ethHash #${ethHash}`);

	const { eventId, source } = args;
	let output: string | void = undefined;

	switch (source.toLowerCase()) {
		case pegPalletAddress.bridge.toLowerCase(): {
			log.info(`update TxAuthSetChange record with eventId #${eventId}`);
			const exist = await store.txAuthSetChange.findFirst({
				where: { eventId },
			});
			if (!exist) {
				log.warn(
					`TxAuthSetChange record with eventId #${eventId} is not found`
				);
				output = "skipped";
				break;
			}
			store.$push(
				store.txAuthSetChange.update({
					where: { eventId },
					data: {
						ethHash,
						status: TxStatus.ProcessingOk,
						updatedAt: new Date(),
					},
				})
			);

			output = "done";
			break;
		}

		case pegPalletAddress.erc20.toLowerCase():
		case pegPalletAddress.erc721.toLowerCase(): {
			log.info(`update TxWithdrawal record with eventId #${eventId}`);
			const exist = await store.txWithdrawal.findFirst({ where: { eventId } });
			if (!exist) {
				log.warn(`TxWithdrawal record with eventId #${eventId} is not found`);
				output = "skipped";
				break;
			}
			store.$push(
				store.txWithdrawal.updateMany({
					where: { eventId },
					data: {
						ethHash,
						status: TxStatus.ProcessingOk,
						updatedAt: new Date(),
					},
				})
			);
			output = "done";
			break;
		}
	}

	if (output) log.info(output);
}
