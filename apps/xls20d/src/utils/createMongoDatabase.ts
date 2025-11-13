import { MongoDatabase } from "@trncs/utils/MongoDatabase";
import { PrismaClient } from "@trncs/xls20d/prisma";

import { getRedisClient } from "./getRedisClient";

export type Store = PrismaClient;

/**
 * Create a Mongo database that follows the Substrate Database interface
 * @param client An instance of Prisma client
 * @param collectionName A collection name to house the `height` value
 * @returns An implementation of Substrate Database interface
 */
export function createMongoDatabase(
	client: PrismaClient,
	collectionName: string,
	serviceName: string
): MongoDatabase<PrismaClient> {
	return new MongoDatabase<PrismaClient>(client)
		.setRedisClient(getRedisClient())
		.setCollectionName(`${serviceName}-${collectionName}`);
}
