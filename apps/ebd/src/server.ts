import { config as dotenv } from "dotenv";

import { fastifyPort } from "@trncs/ebd/config";
import { getRedisClient } from "@trncs/ebd/utils/getRedisClient";
import { createHealthServer } from "@trncs/utils/createHealthServer";

("use strict");

dotenv();

export default createHealthServer(fastifyPort, getRedisClient());
