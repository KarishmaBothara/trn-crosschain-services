export function shortenHashString(hash: string, len = 10): string {
	const hasPrefix = hash.indexOf("0x") === 0;
	const startLen = hasPrefix ? len + 2 : len;

	return `${hash?.slice(0, startLen)}..${hash?.slice(-len)}`;
}
