import { utils } from "ethers";

import { getBridgeContract } from "./getBridgeContract";

const MAX_AIRDROP_AMOUNT = 2;
const ONE_XRP_IN_ETH = 0.00035;

/**
 * @param bridge - Instance of the bridge Contract
 * @param paidFee - Amount of fee in ETH that has been paid
 * @returns Amount of gas purchase in XRP to airdrop
 */
export async function getAirdropAmount(paidFee: string): Promise<number> {
	const bridge = getBridgeContract();
	const sendMessageFee = await bridge.sendMessageFee();
	const paidFeeBN = utils.parseEther(paidFee);
	const sendMessageFeeBN = utils.parseEther(sendMessageFee.toString());
	const gasPurchaseFeeBN = paidFeeBN.sub(sendMessageFeeBN);

	const gasPurchaseFee = Number(utils.formatEther(gasPurchaseFeeBN));
	if (gasPurchaseFee === 0) return 0;

	return Math.min(gasPurchaseFee / ONE_XRP_IN_ETH, MAX_AIRDROP_AMOUNT);
}
