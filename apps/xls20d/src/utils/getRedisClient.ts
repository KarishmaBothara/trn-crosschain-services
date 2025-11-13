import { getRedisClient as getClient } from "@trncs/utils/getRedisClient";
import { redisUrl } from "@trncs/xls20d/config";

export const getRedisClient = getClient.bind(null, redisUrl);
