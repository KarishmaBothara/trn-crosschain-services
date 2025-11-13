import { ApiPromise } from "@polkadot/api";

let sourcesAddresses: string[] = [];

export async function getSourceContractAddresses(
	rootApi: ApiPromise
): Promise<string[]> {
	if (sourcesAddresses.length !== 0) return sourcesAddresses;
	const [nftPeg, erc20Peg, rootPeg] = await Promise.all([
		rootApi.query.nftPeg.contractAddress(),
		rootApi.query.erc20Peg.contractAddress(),
		rootApi.query.erc20Peg.rootPegContractAddress(),
	]);
	sourcesAddresses = [
		nftPeg.toString(),
		erc20Peg.toString(),
		rootPeg.toString(),
	];
	return sourcesAddresses;
}
