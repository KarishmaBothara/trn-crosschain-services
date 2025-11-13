import { redisUrl } from "@trncs/ebd/config";
import { getRedisClient as getClient } from "@trncs/utils/getRedisClient";

export const getRedisClient = getClient.bind(null, redisUrl);
