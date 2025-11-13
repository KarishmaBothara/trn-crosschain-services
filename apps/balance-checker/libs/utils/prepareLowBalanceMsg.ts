import type { IBalance } from "@trncs/balance-checker/libs/types";

export default function prepareLowBalanceMsg(
	balances: IBalance[],
	isMainnet: boolean,
	network: string,
	account: { alias?: string; address: string }
) {
	let lowBalanceTokens = "";
	for (const { token, formattedBalance, isLowBalance } of balances) {
		if (isLowBalance) lowBalanceTokens += `\n- ${token}: ${formattedBalance}`;
	}
	if (lowBalanceTokens) {
		const mainnetOrTestnet = isMainnet ? "MAINNET" : "TESTNET";
		const accountAlias = account.alias ? ` (${account.alias})` : "";
		return `Token balance(s) for account ${account.address}${accountAlias} is low \nNETWORK: ${network} (${mainnetOrTestnet})\n\nTOKEN(S):${lowBalanceTokens}`;
	}
}
