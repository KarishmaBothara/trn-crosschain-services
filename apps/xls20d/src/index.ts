import { spawn } from "child_process";
import { hideBin } from "yargs/helpers";

import { handleChildProcesses } from "@trncs/utils/handleChildProcesses";

const processor = spawn("node", ["lib/main.js", ...hideBin(process.argv)]);
const server = spawn("fastify", [
	"start",
	"lib/server.js",
	"--",
	// --key=<RedisKey>
	process.argv[process.argv.length - 1],
]);

handleChildProcesses(server, processor);
