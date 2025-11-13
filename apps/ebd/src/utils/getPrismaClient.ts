import { PrismaClient } from "@trncs/ebd/prisma";

let client: PrismaClient;
export async function getPrismaClient(): Promise<PrismaClient> {
	if (client) return client;
	const prisma = new PrismaClient();
	await prisma.$connect();
	return (client = prisma);
}
