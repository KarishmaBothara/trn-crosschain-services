import { jest } from "@jest/globals";

export const xls20TokenMap = {
	toJSON: jest.fn(() => null),
};

export const xls20TokenMapExist = {
	toJSON: jest.fn(() => ({
		collection: 176,
		seriesId: 101,
	})),
};
