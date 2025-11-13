import { PrismaClient } from "@trncs/xbd/prisma";

let client: PrismaClient;
export function getPrismaClient(): PrismaClient {
	if (client) return client;
	return (client = new PrismaClient());
}
