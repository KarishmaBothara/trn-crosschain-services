import { BigNumber, constants, utils } from "ethers";

import { pegPalletAddress } from "../config";

export interface EthData {
	to: string;
	ethValue: {
		amount: string;
		tokenAddress: string;
	};
}

export interface Erc20Data {
	to: string;
	erc20Value: {
		amount: string;
		tokenAddress: string;
	};
}

export interface Erc721Data {
	to: string;
	erc721Value: { tokenAddress: string; tokenIds: string[] }[];
}

export interface AuthSetData {
	authSetValue: { setId: number; setValue: string[] };
}

export function decodeMessage(
	pegAddress: string,
	message: string,
	direction: "inbox" | "outbox"
): EthData | Erc20Data | Erc721Data | AuthSetData | void {
	switch (pegAddress.toLowerCase()) {
		case pegPalletAddress.erc20.toLowerCase(): {
			const [tokenAddress, amount, to] = utils.defaultAbiCoder.decode(
				["address", "uint128", "address"],
				message
			) as [string, BigNumber, string];
			const value = {
				amount: amount.toString(),
				tokenAddress,
			};

			if (tokenAddress === constants.AddressZero) {
				return {
					to,
					ethValue: value,
				};
			}

			return {
				to,
				erc20Value: value,
			};
		}

		case pegPalletAddress.erc721.toLowerCase(): {
			const [tokenAddresses, tokenIds, to] = (() => {
				if (direction === "inbox") {
					const [, arg2, arg3, arg4] = utils.defaultAbiCoder.decode(
						["uint256", "address[]", "uint256[][]", "address"],
						message
					);

					return [arg2, arg3, arg4];
				}

				return utils.defaultAbiCoder.decode(
					["address[]", "uint256[][]", "address"],
					message
				);
			})() as [string[], BigNumber[][], string];

			const erc721Value = tokenAddresses.map((tokenAddress, index) => {
				return {
					tokenAddress,
					tokenIds: tokenIds[index].map((item) => item.toString()),
				};
			});

			return { to, erc721Value };
		}

		case pegPalletAddress.bridge.toLowerCase(): {
			const [setValue, setId] = utils.defaultAbiCoder.decode(
				["address[]", "uint32"],
				message
			) as [string[], number];

			return { authSetValue: { setId, setValue } };
		}
	}
}
