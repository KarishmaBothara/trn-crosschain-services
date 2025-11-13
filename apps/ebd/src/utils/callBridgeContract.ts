import {
	TransactionRequest,
	TransactionResponse,
} from "@ethersproject/providers";

import { gasMultiplier } from "@trncs/ebd/config";
import {
	createSlackLogger,
	LoggerChannel,
	LoggerChild,
} from "@trncs/ebd/utils/createSlackLogger";
import { checkEthBalance } from "@trncs/utils/checkEthBalance";
import { minEthInWallet } from "@trncs/utils/config";

import { getBridgeContract } from "./getBridgeContract";

const slack = createSlackLogger(LoggerChannel.Outgoing, LoggerChild.Root);
export async function callBridgeContract(
	call: string,
	args: unknown[],
	payFee = false,
	overrides?: Pick<TransactionRequest, "nonce">
): Promise<TransactionResponse> {
	const bridge = getBridgeContract();

	const txValue = payFee ? await bridge.bridgeFee() : null;
	const gasFee = await bridge.estimateGas[call](...args, { value: txValue });
	const signer = await bridge.signer.getAddress();
	const transactionResponse = (await bridge[call](...args, {
		value: txValue,
		gasLimit: (gasFee.toNumber() * gasMultiplier).toFixed(),
		...overrides,
	})) as TransactionResponse;
	const [sufficient, currentAmount] = await checkEthBalance(
		bridge.provider,
		signer
	);
	if (!sufficient) {
		slack.warn(
			`Relayer account \`${signer}\` ETH balance on Ethereum is lower than \`${minEthInWallet} ETH\`, current balance is \`${currentAmount} ETH\`.`
		);
	}
	return transactionResponse;
}
