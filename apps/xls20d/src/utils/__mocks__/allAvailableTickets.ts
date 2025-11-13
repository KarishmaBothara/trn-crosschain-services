import { jest } from "@jest/globals";

// export const allAvailableTickets = {
//     toJSON: jest.fn(),
// };

export const allAvailableTickets = jest.fn(() => Promise.resolve([1, 2, 3]));
