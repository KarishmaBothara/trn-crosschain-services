import { TransactionMetadata, Wallet } from "xrpl";

import { XRPLDoorAccount } from "@trncs/specs/generated/v59";
import { checkRootXRPBalance } from "@trncs/utils/checkRootXRPBalance";
import { checkXRPFeeBalance } from "@trncs/utils/checkXRPFeeBalance";
import { minXRPInWallet } from "@trncs/utils/config";
import { createRelayerKeyring } from "@trncs/utils/createRelayerKeyring";
import { submitExtrinsic } from "@trncs/utils/submitExtrinsic";
import {
	ExtContext,
	ThresholdReachedArgs,
} from "@trncs/xbd/commands/ticket/processRootSide";
import {
	rootRelayerSeed,
	xrplDoorSeed,
	xrplMinterDoorSeed,
} from "@trncs/xbd/config";
import { burnUnusedTickets } from "@trncs/xbd/utils/burnUnusedTickets";
import { fetchAccountTickets } from "@trncs/xbd/utils/fetchAccountTickets";
import { getRootApi } from "@trncs/xbd/utils/getRootApi";
import { getXrplClient } from "@trncs/xbd/utils/getXrplClient";

const MAX_TICKET_COUNT = 250;
const xrplWallet = Wallet.fromSeed(xrplDoorSeed);
const mintWallet = Wallet.fromSeed(xrplMinterDoorSeed);
const rootKeyring = createRelayerKeyring(rootRelayerSeed);

async function fetchActiveTicketCount(
	currentDoorSequence: number,
	{ slack }: ExtContext,
	preservedTickets: number[],
	doorAccount: XRPLDoorAccount
): Promise<number> {
	const xrplClient = await getXrplClient();
	const wallet = doorAccount.__kind === "Main" ? xrplWallet : mintWallet;
	const allTickets = await fetchAccountTickets(xrplClient, wallet.address);
	const filteredTickets = allTickets.filter(function (ticket) {
		return !preservedTickets.includes(ticket);
	});
	const burntTickets = await burnUnusedTickets(
		xrplClient,
		wallet,
		filteredTickets,
		currentDoorSequence
	);

	const activeTicketCount = allTickets.length - burntTickets.length;

	slack.warn(
		`Burnt tickets = ${burntTickets.length}, remain active tickets = ${activeTicketCount}`
	);
	return activeTicketCount;
}

export async function handleThresholdReachedEvent(
	ctx: ExtContext,
	item: ThresholdReachedArgs,
	preservedMainDoorTickets: number[],
	preservedNFTDoorTickets: number[]
): Promise<void> {
	const log = (ctx.log = ctx.log.child(ctx.index.toString()));
	const { doorAccount, currentTicket } = item;
	log.info(
		`received event "Threshold Reached" for door account ${JSON.stringify(
			doorAccount
		)}`
	);

	const preserveTickets =
		doorAccount.__kind === "Main"
			? preservedMainDoorTickets
			: preservedNFTDoorTickets;
	const activeTicketsCount = await fetchActiveTicketCount(
		currentTicket,
		ctx,
		preserveTickets,
		doorAccount
	);
	const ticketCount = MAX_TICKET_COUNT - activeTicketsCount; // check how many more tickets can be created
	const currentSequence = ticketCount
		? await requestAdditionalTickets(ctx, ticketCount, doorAccount)
		: undefined;

	if (!currentSequence) return;
	await updateTicketSequenceNext(
		ctx,
		currentSequence + 1,
		ticketCount,
		doorAccount
	);
}

async function fetchCurrentSequenceParams(
	{ log }: ExtContext,
	doorAccount: XRPLDoorAccount
): Promise<number> {
	const rootApi = await getRootApi();

	log.info(`fetch current sequence params:: ${doorAccount.__kind}`);
	const door = rootApi.registry.createType(
		"XRPLDoorAccount",
		doorAccount.__kind
	);

	const _currentSequence = await rootApi.query.xrplBridge.doorTicketSequence(
		door
	);

	const currentSequence = _currentSequence.toJSON() as number;

	log.info(`currentSequence: ${currentSequence}`);
	return currentSequence;
}

async function requestAdditionalTickets(
	{ log, slack }: ExtContext,
	ticketCount: number,
	doorAccount: XRPLDoorAccount
): Promise<number | undefined> {
	const xrplClient = await getXrplClient();

	log.info(`request XPRL for additional ${ticketCount} tickets`);
	const wallet = doorAccount.__kind === "Main" ? xrplWallet : mintWallet;
	const payload = await xrplClient.autofill({
		Account: wallet.address,
		TransactionType: "TicketCreate",
		TicketCount: ticketCount,
	});

	const tx = wallet.sign(payload);

	const {
		result: { Sequence: accountSequence, meta },
	} = await xrplClient.submitAndWait(tx.tx_blob);

	const status = (meta as TransactionMetadata)?.TransactionResult;

	const [sufficient, currentAmount] = await checkXRPFeeBalance(
		xrplClient,
		wallet.address
	);
	if (!sufficient) {
		slack.warn(
			`Door account \`${wallet.address}\` XRP balance on XRPL is lower than ${minXRPInWallet} XRP), current balance is \`${currentAmount} XRP\`.`
		);
	}

	if (status !== "tesSUCCESS") {
		log.warn(`unable to request addtional tickets, result "${status}"`);
		slack.warn(`unable to request addtional tickets, result "${status}"`);
		return;
	}

	return accountSequence;
}

async function updateTicketSequenceNext(
	{ log, slack }: ExtContext,
	startSequence: number,
	ticketCount: number,
	doorAccount: XRPLDoorAccount
) {
	const rootApi = await getRootApi();
	const door = rootApi.registry.createType(
		"XRPLDoorAccount",
		doorAccount.__kind
	);

	log.info(
		`update Root with next ticket sequence, start: ${startSequence}, size: ${ticketCount}, door: ${door.toHuman()}`
	);

	await submitExtrinsic(
		rootApi.tx.xrplBridge.setTicketSequenceNextAllocation(
			door,
			startSequence,
			ticketCount
		),
		rootKeyring
	);
	const [sufficient, currentAmount] = await checkRootXRPBalance(
		rootApi,
		rootKeyring.address
	);
	if (!sufficient) {
		slack.warn(
			`Relayer account \`${rootKeyring.address}\` XRP balance on TRN is lower than \`${minXRPInWallet} XRP\`, current balance is \`${currentAmount} XRP\`.`
		);
	}
}
