import { PrismaClient } from "@trncs/ebd/prisma";
import { BatchTransaction, ProxyDatabase } from "@trncs/utils/ProxyDatabase";

import { getRedisClient } from "./getRedisClient";

export type Store = PrismaClient & BatchTransaction;

/**
 * Create a Mongo database that follows the Substrate Database interface
 * @param client An instance of Prisma client
 * @param collectionName A collection name to house the `height` value
 * @returns An implementation of Substrate Database interface
 */
export function createProxyDatabase(
	client: PrismaClient,
	collectionName: string,
	serviceName: string
): ProxyDatabase<PrismaClient> {
	return new ProxyDatabase<PrismaClient>(client)
		.setRedisClient(getRedisClient())
		.setRedisPrefix(`${serviceName}-${collectionName}`);
}
