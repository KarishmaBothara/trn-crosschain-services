import { Database } from "@subsquid/substrate-processor/lib/interfaces/db";
import assert from "assert";
import { Redis } from "ioredis";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MongoDatabase<S extends { $runCommandRaw: any }>
	implements Database<S>
{
	protected client: S;
	protected collectionName: string | undefined;
	protected redis: Redis | undefined;

	constructor(client: S) {
		this.client = client;
	}

	setCollectionName(collectionName: string): this {
		this.collectionName = collectionName;
		return this;
	}

	setRedisClient(redis: Redis): this {
		this.redis = redis;
		return this;
	}

	async connect(): Promise<number> {
		assert(this.collectionName, "Status table is not set");
		assert(this.redis, "Redis client is not set");
		const key = this.collectionName;
		const height = await this.redis.get(key);
		return height ? parseInt(height) : -1;
	}

	async transact(
		from: number,
		to: number,
		cb: (store: S) => Promise<void>
	): Promise<void> {
		await cb(this.client);
		await this.updateHeight(this.client, from, to);
	}

	async advance(height: number): Promise<void> {
		await this.updateHeight(this.client, height, height);
	}

	protected async updateHeight(
		_client: S,
		_from: number,
		to: number
	): Promise<void> {
		assert(this.collectionName, "Status table is not set");
		assert(this.redis, "Redis client is not set");
		await this.redis.set(this.collectionName, to);
	}
}
