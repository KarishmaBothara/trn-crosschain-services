import type { Redis } from "ioredis";

let previousHeight = 0;

export async function primePreviousBlockHeight(
	redis: Redis,
	redisKey: string
): Promise<void> {
	const startingHeight = await redis.get(redisKey);
	if (!startingHeight)
		throw new Error(`No starting height found for Redis key ${redisKey}`);

	previousHeight = +startingHeight;
}

export async function isBlockHeightProgressed(
	redis: Redis,
	redisKey: string
): Promise<[number, boolean]> {
	// We can assert not null as this is checked in `primePreviousBlockHeight`
	const height = +(await redis.get(redisKey))!;

	const tempHeight = previousHeight;
	previousHeight = height;

	return [height, height > tempHeight];
}
