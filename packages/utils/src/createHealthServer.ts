import assert from "assert";
import type { FastifyPluginAsync } from "fastify";
import type { Redis } from "ioredis";

import {
	isBlockHeightProgressed,
	primePreviousBlockHeight,
} from "./isBlockHeightProcessed";

export function createHealthServer(fastifyPort: number, redis: Redis) {
	const server: FastifyPluginAsync = async (fastify, opts) => {
		assert("key" in opts, "Missing `key` argument");
		const { key } = opts as { key: string };

		await primePreviousBlockHeight(redis, key);
		console.log(`🚀 Server listening on port ${fastifyPort}`);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		fastify.get("/health", async (_req, res) => {
			try {
				const [height, isProgressed] = await isBlockHeightProgressed(
					redis,
					key
				);
				if (isProgressed) return res.status(200).send({ height });

				return res.status(400).send({
					height,
					error: {
						message: `${key} height has not increased since last check`,
					},
				});
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error });
			}
		});
	};

	return server;
}
