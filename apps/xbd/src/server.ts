import { config as dotenv } from "dotenv";

import { createHealthServer } from "@trncs/utils/createHealthServer";
import { fastifyPort } from "@trncs/xbd/config";
import { getRedisClient } from "@trncs/xbd/utils/getRedisClient";

("use strict");

dotenv();

export default createHealthServer(fastifyPort, getRedisClient());
