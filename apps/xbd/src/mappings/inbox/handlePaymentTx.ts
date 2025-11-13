import BigNumber from "bignumber.js";
import { convertHexToString, convertStringToHex, decodeAccountID } from "xrpl";
import { IssuedCurrencyAmount } from "xrpl/dist/npm/models/common";

import { checkRootXRPBalance } from "@trncs/utils/checkRootXRPBalance";
import { minXRPInWallet } from "@trncs/utils/config";
import { createModelUpsertArgs } from "@trncs/utils/createModelUpsertArgs";
import { createRelayerKeyring } from "@trncs/utils/createRelayerKeyring";
import { isStringInArray } from "@trncs/utils/isStringInArray";
import { submitExtrinsic } from "@trncs/utils/submitExtrinsic";
import { ExtContext } from "@trncs/xbd/commands/inbox/processXrplSide";
import { rootRelayerSeed } from "@trncs/xbd/config";
import { devCallers } from "@trncs/xbd/config";
import { Prisma, TxDeposit, TxStatus } from "@trncs/xbd/prisma";
import { PaymentTx } from "@trncs/xbd/types";
import { getRootApi } from "@trncs/xbd/utils/getRootApi";
import currenciesPorcini from "@trncs/xbd/xrpl_currencies_porcini.json";
import currenciesRoot from "@trncs/xbd/xrpl_currencies_root.json";

const signer = createRelayerKeyring(rootRelayerSeed);
const SKIPPABLE_ERRORS = ["xrplBridge.TxReplay", "Priority is too low"];
const MAX_BALANCE_ALLOWED = new BigNumber("340282366920938463463374607431768211455"); // MAX u128/balance from rust

export async function handlePaymentTx(
	ctx: ExtContext,
	tx: PaymentTx
): Promise<void> {
	const { store, slack } = ctx;
	const xrplHash = tx.hash!;
	const log = (ctx.log = ctx.log.child("PaymentTx"));
	const rootApi = await getRootApi();
	const from = tx.Account;
	const to = convertHexToString(tx.Memos![0].Memo.MemoData!);
	const chainName = await rootApi.rpc.system.chain();
	const xrpValue = getXrpValue(tx.Amount, chainName.toString().toLowerCase(), slack);
	log.info(`XRP value::${JSON.stringify(xrpValue)}`);
	if (!xrpValue) {
		log.warn(
			`Ignore transaction with xrplHash #${xrplHash} since it has unsupported currency`
		);
		return log.info("skipped");
	}
	const tokenName = xrpValue?.tokenName;
	let nonXRPCurencyIssuer;
	// If payment type is not for XRP transfer, then check if the currency/token has mapping on TRN, also check the issuer mapped
	if (tokenName !== "XRP") {
		const nonXRPSymbol =
			tokenName?.length === 3
				? rootApi.createType("XRPLCurrencyType", { Standard: tokenName })
				: rootApi.createType("XRPLCurrencyType", { NonStandard: tokenName });
		console.log("nonXRPCurrency::", nonXRPSymbol);
		const rippleIssuer = (tx.Amount as IssuedCurrencyAmount).issuer;
		const issuerInTRN = `0x${convertStringToHex(
			decodeAccountID(rippleIssuer)
		)}`;
		nonXRPCurencyIssuer = rootApi.createType("XRPLCurrency", {
			symbol: nonXRPSymbol,
			issuer: issuerInTRN,
		});
		const assetId = (
			await rootApi.query.xrplBridge.xrplToAssetId(nonXRPCurencyIssuer)
		).toJSON();
		log.info(`mapped assetId::${JSON.stringify(assetId)}`);
		if (!assetId) {
			log.warn(
				`Ignore transaction with xrplHash #${xrplHash} since it has unsupported currency or
				mapping in TRN does not exist`
			);
			return log.info("skipped");
		}
	}

	log.info(`start with xrplHash #${xrplHash}`);

	if (isStringInArray(from, devCallers)) {
		log.warn(
			`Ignore transaction with xrplHash #${xrplHash} since it was sent from a DEV account "${from}"`
		);
		return log.info("skipped");
	}

	log.info(`upsert TxDeposit record with xrplHash #${xrplHash}`);
	store.$push(
		store.txDeposit.upsert(
			createModelUpsertArgs<TxDeposit, Prisma.TxDepositUpsertArgs>(
				{
					xrplHash,
				},
				{
					xrplHash,
					from,
					to,
					xrpValue,
					status: TxStatus.Processing,
				}
			)
		)
	);

	log.info(`submit transaction with xrplHash #${xrplHash} to Root`);
	let txData;
	if (xrpValue.tokenName === "XRP") {
		txData = rootApi.createType("XRPLTxData", {
			Payment: {
				amount: xrpValue.amount,
				destination: to,
			},
		});
	} else {
		txData = rootApi.createType("XRPLTxData", {
			CurrencyPayment: {
				amount: xrpValue.amount,
				address: to,
				currency: nonXRPCurencyIssuer,
			},
		});
	}
	log.info(`txData:${JSON.stringify(txData)}`);
	await submitExtrinsic(
		rootApi.tx.xrplBridge.submitTransaction(
			tx.ledger_index,
			xrplHash,
			txData,
			new Date().getTime()
		),
		signer
	).catch((error) => {
		const matched = SKIPPABLE_ERRORS.some((phrase) =>
			error.message ? error.message.indexOf(phrase) >= 0 : false
		);
		if (!matched) throw error;
		log.warn(
			`Ignore transaction with xrplHash #${xrplHash} since error with message "${error.message}" is skippable`
		);
	});
	const [sufficient, currentAmount] = await checkRootXRPBalance(
		rootApi,
		signer.address
	);
	if (!sufficient) {
		slack.warn(
			`Relayer account \`${signer.address}\` XRP balance on TRN is lower than ${minXRPInWallet} XRP, current balance is \`${currentAmount} XRP\`.`
		);
	}

	log.info(`done`);
}

function getXrpValue(txAmount: PaymentTx["Amount"], chainName: string, slack) {
	console.log("Chain name:", chainName);
	if (typeof txAmount === "string")
		return {
			amount: txAmount,
			tokenName: "XRP",
		};
	const xrplCurrencies: Record<
		string,
		{
			symbol: string;
			decimals: number;
		}
	> = chainName === "porcini" ? currenciesPorcini : currenciesRoot;
	console.log("xrplCurrencies:", xrplCurrencies);
	const currency = xrplCurrencies[txAmount.currency.toLowerCase()];
	if (!currency) return;

	const amount = new BigNumber(txAmount.value).multipliedBy(
		10 ** currency.decimals
	);
	if (amount.gt(MAX_BALANCE_ALLOWED)) {
		slack.error(
			`Amount: ${amount.toFixed()} is bigger than allowed balance: ${MAX_BALANCE_ALLOWED.toFixed()} `
		);
		return null; // skip this record so that relayer does not break
	}
	console.log("Amount:", amount);
	const amountStr = amount.decimalPlaces(0, BigNumber.ROUND_DOWN).toFixed();
	console.log("Amount str:", amount);
	let tokenName = currency.symbol;
	console.log("tokenName:", tokenName);
	// If not standard currency code - https://xrpl.org/docs/references/protocol/data-types/currency-formats#standard-currency-codes
	if (tokenName.length !== 3) {
		// https://xrpl.org/docs/references/protocol/data-types/currency-formats#nonstandard-currency-codes
		tokenName = `0x${tokenName}`;
	}
	console.log("tokenNameH160:", tokenName);
	return {
		amount: amountStr,
		tokenName,
	};
}
