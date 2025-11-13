/* eslint-disable @typescript-eslint/no-var-requires */
import { Argv } from "yargs";

require("dotenv").config();

require("yargs")(process.argv.slice(2))
	.command(
		"inbox <commands>",
		"Group of commands that handle incoming events (Xrpl->Root)",
		(instance: Argv) => {
			return instance
				.command(require("./commands/inbox/processXrplSide"))
				.command(require("./commands/inbox/processRootSide"));
		}
	)
	.command(
		"outbox <commands>",
		"Group of commands that handle outgoing events (Root->Xrpl)",
		(instance: Argv) => {
			return instance
				.command(require("./commands/outbox/processRootSide"))
				.command(require("./commands/outbox/processXrplSide"));
		}
	)
	.command(
		"ticket <commands>",
		"Group of commands that handle ticket sequence issuance",
		(instance: Argv) => {
			return instance
				.command(require("./commands/ticket/processRootSide"))
				.command(require("./commands/ticket/burnUnusedTickets"))
				.command(require("./commands/ticket/fetchAccountTickets"));
		}
	)
	.command(
		"trustline <commands>",
		"Command to listen to incoming trustline transaction to door account",
		(instance: Argv) => {
			return instance.command(
				require("./commands/trustline/listenAccountLines")
			);
		}
	)
	.demandCommand()
	.help().argv;
