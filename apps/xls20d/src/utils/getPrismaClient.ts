import { PrismaClient } from "@trncs/xls20d/prisma";

let client: PrismaClient;
export function getPrismaClient(): PrismaClient {
	if (client) return client;
	return (client = new PrismaClient());
}
