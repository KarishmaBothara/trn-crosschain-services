export default function getAssetPrecompileAddress(assetId: number) {
	const assetIdHex = assetId.toString(16).padStart(8, "0").toUpperCase();
	return `0xCCCCCCCC${assetIdHex}000000000000000000000000`;
}
