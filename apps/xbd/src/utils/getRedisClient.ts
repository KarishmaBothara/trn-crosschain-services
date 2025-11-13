import { getRedisClient as getClient } from "@trncs/utils/getRedisClient";
import { redisUrl } from "@trncs/xbd/config";

export const getRedisClient = getClient.bind(null, redisUrl);
