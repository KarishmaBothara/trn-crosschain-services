import { config as dotenv } from "dotenv";

import { createHealthServer } from "@trncs/utils/createHealthServer";
import { fastifyPort } from "@trncs/xls20d/config";
import { getRedisClient } from "@trncs/xls20d/utils/getRedisClient";

("use strict");

dotenv();

export default createHealthServer(fastifyPort, getRedisClient());
