/* eslint-disable @typescript-eslint/no-var-requires */
import { Argv } from "yargs";

require("dotenv").config();
require("yargs")(process.argv.slice(2))
	.command(
		"outbox <commands>",
		"Group of commands that handle outgoing events (Root->XRPL)",
		(instance: Argv) => {
			return instance
				.command(require("./commands/outbox/processRootSide"))
				.command(require("./commands/outbox/processXrplSide"));
		}
	)
	.command(
		"inbox <commands>",
		"Group of commands that handle incoming events (Root->XRPL)",
		(instance: Argv) => {
			return (
				instance
					.command(require("./commands/inbox/processRootSide"))
					.command(require("./commands/inbox/processXrplSide"))
			);
		}
	)
	.command(
		"debug <commands>",
		"Group of commands for dev debugging",
		(instance: Argv) => {
			return instance
				.command(require("./commands/debug/mintNFTs"))
				.command(require("./commands/debug/mapNFTs"));
		}
	)
	.demandCommand()
	.help().argv;
