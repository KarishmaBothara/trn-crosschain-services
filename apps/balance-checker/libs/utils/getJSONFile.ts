import { ACCOUNTS_TOKENS } from "@trncs/balance-checker/libs/constants";

export default async function getJSONFile() {
	return (await import("@trncs/balance-checker/config" + ACCOUNTS_TOKENS))
		.default;
}
