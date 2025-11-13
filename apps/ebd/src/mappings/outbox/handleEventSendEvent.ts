import { EventRecord } from "@polkadot/types/interfaces";
import { u8aToHex } from "@polkadot/util";

import {
	EventSendArgs,
	EventSendItem,
	ExtContext,
} from "@trncs/ebd/commands/outbox/processRootSide";
import {
	devCallers,
	pegPalletAddress,
	slackMentions,
	trnHttpEndpoints,
} from "@trncs/ebd/config";
import {
	ObxAuthSet,
	Prisma,
	TxAuthSetChange,
	TxStatus,
	TxWithdrawal,
} from "@trncs/ebd/prisma";
import { callBridgeContract } from "@trncs/ebd/utils/callBridgeContract";
import { createECDSASignature } from "@trncs/ebd/utils/createECDSASignature";
import {
	AuthSetData,
	decodeMessage,
	Erc20Data,
} from "@trncs/ebd/utils/decodeMessage";
import { formatBridgeEventProof } from "@trncs/ebd/utils/formatBridgeEventProof";
import { getRootApi } from "@trncs/ebd/utils/getRootApi";
import { EthySigningRequest_Ethereum } from "@trncs/specs/generated/v54";
import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import { fetchEventProof } from "@trncs/utils/fetchProofFromEndpoint";
import { isStringInArray } from "@trncs/utils/isStringInArray";
import { submitTransaction } from "@trncs/utils/submitTransaction";

type AuthSetInput = Pick<
	TxAuthSetChange,
	"eventId" | "eventAuthSetId" | "eventSignature" | "eventInfo"
>;

type WithdrawalInput = Pick<
	TxWithdrawal,
	"eventId" | "eventAuthSetId" | "eventSignature" | "eventInfo"
>;

interface RawEventProof {
	event_id: number;
	signatures: string[];
	validators: string[];
	validator_set_id: number;
	block: string;
	tag?: string;
}

export async function handleEventSendEvent(
	ctx: ExtContext,
	item: EventSendItem,
	args: EventSendArgs
): Promise<void> {
	const { slack, store } = ctx;
	const logId = item.event.extrinsic?.id ?? item.event.id;
	const logIdType = item.event.extrinsic?.id ? "extrinsicId" : "eventItemId";
	const log = (ctx.log = ctx.log.child("EventSend"));

	log.info(`start with ${logIdType} #${logId}`);

	const { eventProofId, signingRequest } = args;
	const source = u8aToHex(signingRequest.value.source);
	const message = u8aToHex(signingRequest.value.message);

	log.info(`fetch the proof for eventProofId #${eventProofId}`);
	const eventId = Number(eventProofId);
	let eventProof = null;
	try {
		eventProof = (await fetchEventProof(
			eventId,
			trnHttpEndpoints,
			"ethy_getEventProof"
		)) as RawEventProof;
	} catch (e: any) {
		const blockHeight = item.header.height;
		if (source === pegPalletAddress.bridge.toLowerCase()) {
			const authSetData: AuthSetData = decodeMessage(
				source,
				message,
				"outbox"
			) as AuthSetData;
			const validatorSetId = authSetData.authSetValue.setId;
			const validatorSets = authSetData.authSetValue.setValue;
			slack.warn(
				`Proof not found, skip processing AuthoritySetChange event with eventId #${eventId}, at block #${blockHeight}.\n\nvalidatorSetId=${validatorSetId}\nvalidatorSet= ${JSON.stringify(
					validatorSets
				)}, ATN: ${slackMentions}`
			);
		} else {
			slack.warn(
				`Proof not found, skip processing Withdrawal event with eventId #${eventId}, at block #${blockHeight}`
			);
		}
		return;
	}
	const { validator_set_id, validators, signatures } = eventProof;

	log.info(`upsert ObxAuthSet record with setId #${validator_set_id}`);
	await submitTransaction(
		async () =>
			await store.obxAuthSet.upsert(
				createModelUpsertArgs<ObxAuthSet, Prisma.ObxAuthSetUpsertArgs>(
					{ setId: validator_set_id },
					{
						setId: validator_set_id,
						setValue: validators,
					}
				)
			),
		{ log }
	);

	const eventInput = {
		eventId,
		eventAuthSetId: validator_set_id,
		eventInfo: {
			source: source,
			destination: u8aToHex(signingRequest.value.destination),
			message: message,
		},
		eventSignature: createECDSASignature(signatures),
	};
	let output: string | void = undefined;

	switch (source.toLowerCase()) {
		case pegPalletAddress.bridge.toLowerCase(): {
			output = await handleAuthSetChange(
				ctx,
				item,
				signingRequest,
				eventInput as AuthSetInput
			);
			break;
		}

		case pegPalletAddress.erc20.toLowerCase():
		case pegPalletAddress.erc721.toLowerCase(): {
			output = await handleWithdrawal(
				ctx,
				item,
				eventId,
				signingRequest,
				eventInput as WithdrawalInput
			);
			break;
		}
	}

	if (output) log.info(output);
}

async function handleAuthSetChange(
	ctx: ExtContext,
	item: EventSendItem,
	signingRequest: EthySigningRequest_Ethereum,
	input: AuthSetInput
): Promise<"skipped" | "done"> {
	const { store, log } = ctx;
	const message = u8aToHex(signingRequest.value.message);
	const source = u8aToHex(signingRequest.value.source);
	const data = decodeMessage(source, message, "outbox") as AuthSetData | void;
	const {
		eventId,
		eventAuthSetId,
		eventSignature,
		eventInfo: { destination },
	} = input;

	log.info(`upsert TxAuthSetChange record with eventId #${eventId}`);
	store.$push(
		store.txAuthSetChange.upsert(
			createModelUpsertArgs<TxAuthSetChange, Prisma.TxAuthSetChangeUpsertArgs>(
				{ eventId },
				{
					...input,
					...(data ? { newAuthSetId: data.authSetValue.setId } : null),
					eventItemId: item.event.id,
					status: TxStatus.Processing,
				}
			)
		)
	);

	const obxAuthSet = await store.obxAuthSet.findFirst({
		where: { setId: input.eventAuthSetId },
	});

	if (!obxAuthSet) {
		log.warn(`ObxAuthSet record with setId #${eventAuthSetId} is not found`);
		return "skipped";
	}

	const eventProof = formatBridgeEventProof(
		eventId,
		eventAuthSetId,
		obxAuthSet.setValue,
		eventSignature
	);

	const SKIPPABLE_ERRORS = ["Bridge: eventId replayed"];
	log.info(`submit event with eventId #${eventId} to the Ethereum`);
	await callBridgeContract("receiveMessage", [
		source,
		destination,
		message,
		eventProof,
	])
		.then((tx) => tx?.wait())
		.catch((error) => {
			const matched = SKIPPABLE_ERRORS.some((phrase) =>
				error.message ? error.message.indexOf(phrase) >= 0 : false
			);
			if (!matched) throw error;
			log.warn(
				`Ignore transaction with eventId #${eventId} since error with message "${error.message}" is skippable`
			);
		});

	return "done";
}

async function handleWithdrawal(
	ctx: ExtContext,
	item: EventSendItem,
	eventId: number,
	signingRequest: EthySigningRequest_Ethereum,
	input: WithdrawalInput
): Promise<"skipped" | "done"> {
	const { store, log, slack } = ctx;
	const message = u8aToHex(signingRequest.value.message);
	const source = u8aToHex(signingRequest.value.source);
	const decoded = decodeMessage(source, message, "outbox") as Erc20Data;
	const amount = decoded?.erc20Value?.amount;
	const blockHeight = item.header.height;
	const rootApi = await getRootApi();
	const blockHash = await rootApi.rpc.chain.getBlockHash(blockHeight);
	const events: EventRecord[] = await rootApi.query.system.events.at(blockHash);
	let from: string | null = null;
	// Look for ERC20Peg as for ERC721 withdraw event is handled and from field is updated.
	// Erc20Withdraw {
	// 			asset_id,
	// 			amount,
	// 			beneficiary,
	// 			source,
	const event = events.find(
		(event) =>
			event.event.section === "erc20Peg" &&
			event.event.method === "Erc20Withdraw" &&
			event.event.data[1].toString() === amount &&
			event.event.data[2].toString().toLowerCase() === decoded.to.toLowerCase()
	);
	if (event) {
		from = event.event.data[3].toString();
	}

	let extrinsicId: string | null = null;

	// If a withdrawn event is re-fired by the chain, due to
	// `EthBridge.ProofDelayed` or `Erc20Peg.Erc20WithdrawalDelayed`
	// In those cases: there won't be an extrinsic associate with the `EthBridge.EventSend` event
	// And we would need to either use `evenId` or a cluster of conditions to fetch the real
	// extrinsicId  that has been stored previously when we handle those delayed events.
	if (!item.event.extrinsic) {
		let withdrawal = await store.txWithdrawal.findFirst({
			where: { eventId },
		});

		if (!withdrawal) {
			log.warn(`TxWithdrawal record with eventId #${eventId} is not found`);
			slack.warn(`TxWithdrawal record with eventId #${eventId} is not found`);

			const auxData = {
				delayedAmount: amount,
				releaseAtBlock: blockHeight,
			};

			withdrawal = await store.txWithdrawal.findFirst({
				where: {
					auxData: { equals: auxData },
					status: TxStatus.Delayed,
					to: decoded.to,
				},
			});

			if (!withdrawal) {
				log.info(
					`Skipping withdrawal event send event with data #${JSON.stringify(
						item
					)}`
				);
				slack.warn(
					`Skipping withdrawal event send event with data #${JSON.stringify(
						item
					)}`
				);
				return "skipped";
			}
		}

		extrinsicId = withdrawal.extrinsicId;
		if (!from) {
			from = withdrawal.from;
		}
	}

	if (item.event.extrinsic) {
		extrinsicId = item.event.extrinsic.id;
		if (!from) {
			from = item.event.extrinsic.signature?.address as string;
		}
	}

	if (!extrinsicId) {
		log.warn(`extrinsicId is null`);
		return "skipped";
	}

	if (isStringInArray(from, devCallers)) {
		log.info(
			`Ignore transaction with extrinsicId #${extrinsicId} since it was sent from a DEV account "${from}"`
		);
		return "skipped";
	}

	log.info(`upsert TxWithdrawal record with extrinsicId #${extrinsicId}`);
	store.$push(
		store.txWithdrawal.upsert(
			createModelUpsertArgs<TxWithdrawal, Prisma.TxWithdrawalUpsertArgs>(
				{ extrinsicId },
				{
					...input,
					...decoded,
					extrinsicId,
					from,
					status: TxStatus.Processing,
				}
			)
		)
	);
	return "done";
}
