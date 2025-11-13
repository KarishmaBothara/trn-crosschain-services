import { getXrplClioClient } from "@trncs/xls20d/utils/getXrplClioClient";

import { NFToken } from "../types";

export async function checkIfTransferableNft(
	tokenId: string
): Promise<boolean> {
	const client = await getXrplClioClient();
	const tokenInfo = await client.request({
		id: 1,
		command: "nft_info",
		nft_id: tokenId,
	});
	console.log("tokenInfo::", tokenInfo);
	return (tokenInfo.result as NFToken).flags === 8;
}
