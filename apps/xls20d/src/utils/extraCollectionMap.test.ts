import { describe, expect, it, jest } from "@jest/globals";

import {
	xls20TokenMap,
	xls20TokenMapExist,
} from "@trncs/xls20d/utils/__mocks__/xls20TokenMap";

import { extractCollectionMap } from "./extraCollectionMap";

const mockApi = {
	query: {
		xls20: {
			xls20TokenMap: jest.fn((collectionId, serialId) => {
				if (
					(collectionId === 176 && serialId === 100) ||
					(collectionId === 179 && serialId === 87)
				) {
					return xls20TokenMap;
				}
				if (collectionId === 176 && serialId === 101) {
					return xls20TokenMapExist;
				}
			}),
		},
	},
};

describe("extract collection map", () => {
	it(`Extract non mapped tokens on root network
		`, async () => {
		const mockMintRequest = [
			{
				tokenId:
					"0009000037D2C44FCFF178B0C7F3FB0C88F516A02A70BED7EB38ADBC0001C73D",
				collectionId: 176,
				serialId: 100,
			},
			{
				tokenId:
					"0009000037D2C44FCFF178B0C7F3FB0C88F516A02A70BED7EB38ADBC0001C73E",
				collectionId: 176,
				serialId: 101,
			},
			{
				tokenId:
					"0009000037D2C44FCFF178B0C7F3FB0C88F516A02A70BED7EB38ADBC0001C83E",
				collectionId: 179,
				serialId: 87,
			},
		];
		const collectionMap = await extractCollectionMap(
			mockMintRequest as any,
			mockApi as any
		);
		console.log("collectionMap::", JSON.stringify(collectionMap));
		const collectionMapExpected = [
			{
				collectionId: 176,
				tokenMappings: [
					100,
					new Uint8Array([
						48, 48, 48, 57, 48, 48, 48, 48, 51, 55, 68, 50, 67, 52, 52, 70, 67,
						70, 70, 49, 55, 56, 66, 48, 67, 55, 70, 51, 70, 66, 48, 67, 56, 56,
						70, 53, 49, 54, 65, 48, 50, 65, 55, 48, 66, 69, 68, 55, 69, 66, 51,
						56, 65, 68, 66, 67, 48, 48, 48, 49, 67, 55, 51, 68,
					]),
				],
			},
			{
				collectionId: 179,
				tokenMappings: [
					87,
					new Uint8Array([
						48, 48, 48, 57, 48, 48, 48, 48, 51, 55, 68, 50, 67, 52, 52, 70, 67,
						70, 70, 49, 55, 56, 66, 48, 67, 55, 70, 51, 70, 66, 48, 67, 56, 56,
						70, 53, 49, 54, 65, 48, 50, 65, 55, 48, 66, 69, 68, 55, 69, 66, 51,
						56, 65, 68, 66, 67, 48, 48, 48, 49, 67, 56, 51, 69,
					]),
				],
			},
		];

		expect(collectionMap).toStrictEqual(collectionMapExpected);
	});
});
