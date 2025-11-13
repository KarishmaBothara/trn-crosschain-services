import { ApiPromise, WsProvider } from "@polkadot/api";
import { ApiOptions } from "@polkadot/api/types";

export const apiOptions = (provider: WsProvider): ApiOptions => ({
	noInitWarn: true,
	provider,
	rpc: {
		ethy: {
			getEventProof: {
				description: "Get ETH event proof for event Id",
				params: [
					{
						name: "EventId",
						type: "EthyEventId",
					},
				],
				type: "Json",
			},
			getXrplTxProof: {
				description: "Get XRPL event proof for event Id",
				params: [
					{
						name: "EventId",
						type: "EthyEventId",
					},
				],
				type: "Json",
			},
		},
	},
	types: {
		AccountId: "EthereumAccountId",
		AccountId20: "EthereumAccountId",
		AccountId32: "EthereumAccountId",
		Address: "AccountId",
		LookupSource: "AccountId",
		Lookup0: "AccountId",
		EthereumSignature: {
			r: "H256",
			s: "H256",
			v: "U8",
		},
		ExtrinsicSignature: "EthereumSignature",
		EthyId: "[u8; 32]",
		EthyEventId: "u64",
		EthWalletCall: {
			nonce: "u32",
		},
		XRPLTxData: {
			_enum: {
				Payment: {
					amount: "Balance",
					destination: "H160",
				},
				CurrencyPayment: {
					amount: "Balance",
					address: "H160",
					currency: "XRPLCurrency",
				},
				Xls20: {
					tokenId: "[u8; 32]",
					address: "H160",
				},
			},
			//eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any,
		XRPLCurrencyType: {
			_enum: {
				Standard: "[u8; 3]",
				NonStandard: "[u8; 20]",
			},
		} as any,
		XrplAccountId: "H160",
		XRPLCurrency: {
			symbol: "XRPLCurrencyType",
			issuer: "XrplAccountId",
		} as any,
		VersionedEventProof: {
			_enum: {
				sentinel: null,
				EventProof: "EventProof",
			},
		},
		XRPLDoorAccount: {
			_enum: {
				Main: 0,
				NFT: 1,
			},
		},
	},
});

let api: ApiPromise;
export async function getChainApi(rootWSEndpoint: string): Promise<ApiPromise> {
	if (api) return api;
	const provider = new WsProvider(rootWSEndpoint);
	provider.on("disconnected", () => {
		console.log({ msg: "Provider is disconnected" });
		throw new Error(`Disconnected rpc endpoint ${rootWSEndpoint}`);
	});
	provider.on("error", async () => {
		console.log({ msg: "Error thrown for rpc " });
		throw new Error(`Error thrown for rpc endpoint ${rootWSEndpoint}`);
	});
	provider.on("connected", () => {
		console.log({ msg: "WS provider conneced" });
	});
	return (api = await ApiPromise.create(apiOptions(provider)));
}
