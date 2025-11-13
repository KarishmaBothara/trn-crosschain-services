import { getRedisClient } from "@trncs/xls20d/utils/getRedisClient";

const REDIS_KEY = "XLS20D-Wait-For";

export async function getWaitTimeFromRedis(): Promise<string | null> {
	const redis = getRedisClient();
	const waitForTime: string | null = await redis.get(REDIS_KEY);
	return waitForTime;
}
