import Redis from "ioredis";

let client: Redis;
export function getRedisClient(url: string): Redis {
	if (client) return client;
	client = new Redis(url);
	return client;
}
