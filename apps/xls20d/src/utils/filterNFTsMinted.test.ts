import { describe, expect, it, jest } from "@jest/globals";

import { filterSerialNumberMinted } from "@trncs/xls20d/utils/filterNFTsMinted";

jest.mock("@trncs/xls20d/utils/getXrplClient", () => {
	return {
		getXrplClient: jest.fn().mockReturnValueOnce({
			request: jest
				.fn()
				.mockReturnValueOnce({
					result: {
						marker: true,
						transactions: [
							{
								meta: {
									AffectedNodes: [
										{
											ModifiedNode: {
												FinalFields: {
													Flags: 0,
													NFTokens: [
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E71A9C700000408",
																URI: "687474703A2F2F666C7566776F726C642F31303333",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E77015A000020A3",
																URI: "687474703A2F2F666C7566776F726C642F39363535",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E7D1B9C0000315D",
																URI: "687474703A2F2F666C7566776F726C642F3133393337",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E7FBC39000014C2",
																URI: "687474703A2F2F666C7566776F726C642F36363134",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E8557730000257C",
																URI: "687474703A2F2F666C7566776F726C642F3130383936",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E87FF18000008E1",
																URI: "687474703A2F2F666C7566776F726C642F32323830",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E8D92520000199B",
																URI: "687474703A2F2F666C7566776F726C642F37383535",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E9369B500003636",
																URI: "687474703A2F2F666C7566776F726C642F3135313137",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E95CD3100000DBA",
																URI: "687474703A2F2F666C7566776F726C642F33383134",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E9BA49400002A55",
																URI: "687474703A2F2F666C7566776F726C642F3132313337",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E9C0810000001D9",
																URI: "687474703A2F2F666C7566776F726C642F343733",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EA3E06B00001E74",
																URI: "687474703A2F2F666C7566776F726C642F39303936",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EA9FAAD00002F2E",
																URI: "687474703A2F2F666C7566776F726C642F3133333738",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EAA234A00001293",
																URI: "687474703A2F2F666C7566776F726C642F36303535",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EB0358C0000234D",
																URI: "687474703A2F2F666C7566776F726C642F3130333337",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EB25E29000006B2",
																URI: "687474703A2F2F666C7566776F726C642F31373137",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EB871630000176C",
																URI: "687474703A2F2F666C7566776F726C642F37323936",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EBFC8C600003407",
																URI: "687474703A2F2F666C7566776F726C642F3134353538",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EC0AC4200000B8B",
																URI: "687474703A2F2F666C7566776F726C642F32393630",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EC60BA500002826",
																URI: "687474703A2F2F666C7566776F726C642F3131353738",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54ECC1E1F000038E0",
																URI: "687474703A2F2F666C7566776F726C642F3135373939",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54ECE468400001C45",
																URI: "687474703A2F2F666C7566776F726C642F38353337",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54ED459FE00002CFF",
																URI: "687474703A2F2F666C7566776F726C642F3132383139",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54ED6819B00001064",
																URI: "687474703A2F2F666C7566776F726C642F35343936",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EDC94DD0000211E",
																URI: "687474703A2F2F666C7566776F726C642F39373738",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EDD3D7A00000483",
																URI: "687474703A2F2F666C7566776F726C642F31313536",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EE4D7BC0000153D",
																URI: "687474703A2F2F666C7566776F726C642F36373337",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EEAAF17000031D8",
																URI: "687474703A2F2F666C7566776F726C642F3134303630",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EF2EAF6000025F7",
																URI: "687474703A2F2F666C7566776F726C642F3131303139",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EF312930000095C",
																URI: "687474703A2F2F666C7566776F726C642F32343032",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EF8FD28000036B1",
																URI: "687474703A2F2F666C7566776F726C642F3135323430",
															},
														},
													],
													NextPageMin:
														"9F0C413E817076A581B7630F0C111361E31FC3D5E31FC3D54F75370E000002CF",
													PreviousPageMin:
														"9F0C413E817076A581B7630F0C111361E31FC3D5E31FC3D54E71A9C700000408",
												},
												LedgerEntryType: "NFTokenPage",
												LedgerIndex:
													"9F0C413E817076A581B7630F0C111361E31FC3D5E31FC3D54EF925D500001A16",
												PreviousFields: {
													NFTokens: [
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E71A9C700000408",
																URI: "687474703A2F2F666C7566776F726C642F31303333",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E77015A000020A3",
																URI: "687474703A2F2F666C7566776F726C642F39363535",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E7D1B9C0000315D",
																URI: "687474703A2F2F666C7566776F726C642F3133393337",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E7FBC39000014C2",
																URI: "687474703A2F2F666C7566776F726C642F36363134",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E8557730000257C",
																URI: "687474703A2F2F666C7566776F726C642F3130383936",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E87FF18000008E1",
																URI: "687474703A2F2F666C7566776F726C642F32323830",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E8D92520000199B",
																URI: "687474703A2F2F666C7566776F726C642F37383535",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E9369B500003636",
																URI: "687474703A2F2F666C7566776F726C642F3135313137",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E95CD3100000DBA",
																URI: "687474703A2F2F666C7566776F726C642F33383134",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E9BA49400002A55",
																URI: "687474703A2F2F666C7566776F726C642F3132313337",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54E9C0810000001D9",
																URI: "687474703A2F2F666C7566776F726C642F343733",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EA3E06B00001E74",
																URI: "687474703A2F2F666C7566776F726C642F39303936",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EA9FAAD00002F2E",
																URI: "687474703A2F2F666C7566776F726C642F3133333738",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EAA234A00001293",
																URI: "687474703A2F2F666C7566776F726C642F36303535",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EB0358C0000234D",
																URI: "687474703A2F2F666C7566776F726C642F3130333337",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EB25E29000006B2",
																URI: "687474703A2F2F666C7566776F726C642F31373137",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EB871630000176C",
																URI: "687474703A2F2F666C7566776F726C642F37323936",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EBFC8C600003407",
																URI: "687474703A2F2F666C7566776F726C642F3134353538",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EC0AC4200000B8B",
																URI: "687474703A2F2F666C7566776F726C642F32393630",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EC60BA500002826",
																URI: "687474703A2F2F666C7566776F726C642F3131353738",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54ECE468400001C45",
																URI: "687474703A2F2F666C7566776F726C642F38353337",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54ED459FE00002CFF",
																URI: "687474703A2F2F666C7566776F726C642F3132383139",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54ED6819B00001064",
																URI: "687474703A2F2F666C7566776F726C642F35343936",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EDC94DD0000211E",
																URI: "687474703A2F2F666C7566776F726C642F39373738",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EDD3D7A00000483",
																URI: "687474703A2F2F666C7566776F726C642F31313536",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EE4D7BC0000153D",
																URI: "687474703A2F2F666C7566776F726C642F36373337",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EEAAF17000031D8",
																URI: "687474703A2F2F666C7566776F726C642F3134303630",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EF2EAF6000025F7",
																URI: "687474703A2F2F666C7566776F726C642F3131303139",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EF312930000095C",
																URI: "687474703A2F2F666C7566776F726C642F32343032",
															},
														},
														{
															NFToken: {
																NFTokenID:
																	"000900009F0C413E817076A581B7630F0C111361E31FC3D54EF8FD28000036B1",
																URI: "687474703A2F2F666C7566776F726C642F3135323430",
															},
														},
													],
												},
												PreviousTxnID:
													"97626D7698E3A4BE813C8C3E981AABB811215320D6A2E1C11CCE2BD2D0B6CB45",
												PreviousTxnLgrSeq: 41319387,
											},
										},
										{
											ModifiedNode: {
												FinalFields: {
													Account: "rEVyfzsxXHoEmsa26Dry8AhFH6ebAHeaUf",
													Balance: "9999844446",
													Flags: 0,
													MintedNFTokens: 14561,
													OwnerCount: 538,
													Sequence: 41181364,
												},
												LedgerEntryType: "AccountRoot",
												LedgerIndex:
													"FFDC9C4FCEFEA7235DC194735B40263217B4F697256E1713F1EFE6029395BE6B",
												PreviousFields: {
													Balance: "9999844456",
													MintedNFTokens: 14560,
													Sequence: 41181363,
												},
												PreviousTxnID:
													"8DB5978A7AC4D8D4005E63B0D5514191A85369A16883DE6303E06CF93EB110CE",
												PreviousTxnLgrSeq: 41319512,
											},
										},
									],
									TransactionIndex: 0,
									TransactionResult: "tesSUCCESS",
									nftoken_id:
										"000900009F0C413E817076A581B7630F0C111361E31FC3D54ECC1E1F000038E0",
								},
								tx: {
									Account: "rEVyfzsxXHoEmsa26Dry8AhFH6ebAHeaUf",
									Fee: "10",
									Flags: 9,
									LastLedgerSequence: 41319531,
									Memos: [
										{
											Memo: {
												MemoData: "3231323036385F3135373939",
												MemoType: "526571756573744E6F6E6365",
											},
										},
									],
									NFTokenTaxon: 212068,
									Sequence: 41181363,
									SigningPubKey:
										"0327ED0BE72520E0D7DE1ECF8E0579E5A5E64159EF1D695874C39D8597D09D3A15",
									TransactionType: "NFTokenMint",
									TransferFee: 0,
									TxnSignature:
										"30440220044310D204E71C473E858BE9F907B74D052AF6D7F959CD8B7531711AFF6F427D02204BAFACC80B87402B6E1395B852627A9D336F017E7258369711B44EE97A1D5E63",
									URI: "687474703A2F2F666C7566776F726C642F31303333",
									date: 748368261,
									hash: "5B11E4C8EDFFC38E07555C0F2F0431F9401271DD675B095B0FB820D8C2FC045C",
									inLedger: 41319513,
									ledger_index: 41319513,
								},
								validated: true,
							},
							{
								meta: {},
								tx: {
									Account: "rEVyfzsxXHoEmsa26Dry8AhFH6ebAHeaUf",
									Fee: "10",
									Flags: 9,
									LastLedgerSequence: 41319531,
									Memos: [
										{
											Memo: {
												MemoData: "3231323036385F3135373939",
												MemoType: "526571756573744E6F6E6365",
											},
										},
									],
									NFTokenTaxon: 212068,
									Sequence: 41181363,
									SigningPubKey:
										"0327ED0BE72520E0D7DE1ECF8E0579E5A5E64159EF1D695874C39D8597D09D3A15",
									TransactionType: "NFTokenMint",
									TransferFee: 0,
									TxnSignature:
										"30440220044310D204E71C473E858BE9F907B74D052AF6D7F959CD8B7531711AFF6F427D02204BAFACC80B87402B6E1395B852627A9D336F017E7258369711B44EE97A1D5E63",
									URI: "687474703A2F2F666C7566776F726C642F39363535",
									date: 748368261,
									hash: "5B11E4C8EDFFC38E07555C0F2F0431F9401271DD675B095B0FB820D8C2FC045C",
									inLedger: 41319513,
									ledger_index: 41319513,
								},
								validated: true,
							},
							{
								meta: {},
								tx: {
									Account: "rEVyfzsxXHoEmsa26Dry8AhFH6ebAHeaUf",
									Fee: "10",
									Flags: 9,
									LastLedgerSequence: 41319531,
									Memos: [
										{
											Memo: {
												MemoData: "3231323036385F3135373939",
												MemoType: "526571756573744E6F6E6365",
											},
										},
									],
									NFTokenTaxon: 212068,
									Sequence: 41181363,
									SigningPubKey:
										"0327ED0BE72520E0D7DE1ECF8E0579E5A5E64159EF1D695874C39D8597D09D3A15",
									TransactionType: "NFTokenMint",
									TransferFee: 0,
									TxnSignature:
										"30440220044310D204E71C473E858BE9F907B74D052AF6D7F959CD8B7531711AFF6F427D02204BAFACC80B87402B6E1395B852627A9D336F017E7258369711B44EE97A1D5E63",
									URI: "687474703A2F2F666C7566776F726C642F3133393337",
									date: 748368261,
									hash: "5B11E4C8EDFFC38E07555C0F2F0431F9401271DD675B095B0FB820D8C2FC045C",
									inLedger: 41319513,
									ledger_index: 41319513,
								},
								validated: true,
							},
							{
								meta: {},
								tx: {
									Account: "rEVyfzsxXHoEmsa26Dry8AhFH6ebAHeaUf",
									Fee: "10",
									Flags: 9,
									LastLedgerSequence: 41319531,
									Memos: [
										{
											Memo: {
												MemoData: "3231323036385F3135373939",
												MemoType: "526571756573744E6F6E6365",
											},
										},
									],
									NFTokenTaxon: 212068,
									Sequence: 41181363,
									SigningPubKey:
										"0327ED0BE72520E0D7DE1ECF8E0579E5A5E64159EF1D695874C39D8597D09D3A15",
									TransactionType: "NFTokenMint",
									TransferFee: 0,
									TxnSignature:
										"30440220044310D204E71C473E858BE9F907B74D052AF6D7F959CD8B7531711AFF6F427D02204BAFACC80B87402B6E1395B852627A9D336F017E7258369711B44EE97A1D5E63",
									URI: "687474703A2F2F666C7566776F726C642F36363134",
									date: 748368261,
									hash: "5B11E4C8EDFFC38E07555C0F2F0431F9401271DD675B095B0FB820D8C2FC045C",
									inLedger: 41319513,
									ledger_index: 41319513,
								},
								validated: true,
							},
						],
					},
				})
				.mockReturnValueOnce({
					result: {
						transactions: [],
					},
				}),
		}),
	};
});

describe("filter nfts minted", () => {
	it(`given a list of token uris filter the nfts that are already minted on the chain
		`, async () => {
		const ledgerIndex = 11111;
		const { serialNumbersFiltered, tokenURIFiltered } =
			await filterSerialNumberMinted(
				79972,
				[
					"http://flufworld/1033",
					"http://flufworld/9655",
					"http://flufworld/13937",
					"http://flufworld/6614",
					"http://flufworld/10896",
					"http://flufworld/35086",
				],
				[1033, 9655, 13937, 6614, 10896, 35086],
				"rJNQZkUyvhjnCQexQE4m8qdPJUhPcmNWLD",
				ledgerIndex
			);
		expect(serialNumbersFiltered).toStrictEqual([10896, 35086]);
		expect(tokenURIFiltered).toStrictEqual([
			"http://flufworld/10896",
			"http://flufworld/35086",
		]);
	});
});
