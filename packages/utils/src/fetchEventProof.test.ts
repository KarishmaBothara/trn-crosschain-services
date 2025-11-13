import { describe, expect, it, jest } from "@jest/globals";
import * as axios from "axios";

import { fetchFromEndPoint } from "./fetchProofFromEndpoint";

jest.mock("axios");

axios.post.mockImplementation((url: string) => {
	if (url === "https://root.rootnet.live/archive") {
		return Promise.resolve({ data: { result: mockEventProof } });
	} else {
		return Promise.reject(new Error(`Event proof not found`));
	}
});

const mockEventProof = {
	eventId: 1,
	signatures: ["0x1", "0x2"],
	validators: ["0x3", "0x4"],
	validator_set_id: 1,
	block: 1000,
};

describe("fetchEventProof", () => {
	it(`should...
			- get event proof from mockaxios
		`, async () => {
		const url = "https://root.rootnet.live/archive";
		const eventProof = await fetchFromEndPoint(url, "1", "ethy_getEventProof");

		expect(eventProof).toStrictEqual(mockEventProof);
	});

	it(`should...
			- throws error if \`eventProof\` is not defined
		`, () => {
		fetchFromEndPoint("https://root.wrong.url", "2").catch((error) => {
			expect(error).toBeInstanceOf(Error);
			expect(error).toHaveProperty("message", "Event proof not found");
		});
	});
});
