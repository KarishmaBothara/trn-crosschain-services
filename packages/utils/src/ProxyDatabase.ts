import runtime from "@prisma/client/runtime";
import { Database } from "@subsquid/substrate-processor/lib/interfaces/db";
import assert from "assert";
import { Redis } from "ioredis";

import { SubmitOptions, submitTransaction } from "./submitTransaction";

type PrismaPromise<T> = runtime.Types.Public.PrismaPromise<T>;

export interface BatchTransaction {
	$push: (tx: PrismaPromise<unknown>) => void;
	$commit: (height: number, log: SubmitOptions["log"]) => Promise<void>;
	$transaction: (txs: PrismaPromise<unknown>[]) => Promise<unknown[]>;
}

export class ProxyDatabase<S> implements Database<S> {
	protected prismaClient: S & BatchTransaction;
	protected redisPrefix?: string;
	protected redisClient?: Redis;
	protected $queue: PrismaPromise<unknown>[] = [];

	constructor(prisma: S) {
		this.prismaClient = this.proxyPrismaClient(prisma);
	}

	setRedisPrefix(collectionName: string): this {
		this.redisPrefix = collectionName;
		return this;
	}

	setRedisClient(redis: Redis): this {
		this.redisClient = redis;
		return this;
	}

	async connect(): Promise<number> {
		assert(this.redisClient, "Redis client is not set");
		assert(this.redisPrefix, "Redis prefix is not set");
		const height = await this.redisClient.get(this.redisPrefix);
		return height ? parseInt(height) : -1;
	}

	async transact(
		_from: number,
		to: number,
		cb: (store: S & BatchTransaction) => Promise<void>
	): Promise<void> {
		await cb(this.prismaClient);
		await this.advance(to);
	}

	async advance(height: number): Promise<void> {
		assert(this.redisClient, "Redis client is not set");
		assert(this.redisPrefix, "Status prefix is not set");
		await this.redisClient.set(this.redisPrefix, height);
	}

	protected async $push(tx: PrismaPromise<unknown>): Promise<void> {
		this.$queue.push(tx);
	}

	protected async $commit(
		height: number,
		log: SubmitOptions["log"]
	): Promise<unknown[]> {
		if (!this.$queue.length) return [];
		const results = await submitTransaction(
			async () => await this.prismaClient.$transaction(this.$queue),
			{ log }
		);
		await this.advance(height);
		this.$queue = [];
		return results ?? [];
	}

	private proxyPrismaClient(client: S): S & BatchTransaction {
		return new Proxy(client as unknown as object, {
			get: (target, property, receiver) => {
				switch (property) {
					case "$push":
						return this.$push.bind(this);
					case "$commit":
						return this.$commit.bind(this);
					default:
						return Reflect.get(target, property, receiver);
				}
			},
		}) as S & BatchTransaction;
	}
}
