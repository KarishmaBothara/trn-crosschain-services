/* eslint-disable @typescript-eslint/no-var-requires */
import { Argv } from "yargs";

require("dotenv").config();

require("yargs")(process.argv.slice(2))
	.command(
		"inbox <commands>",
		"Group of commands that handle incoming events (Eth->Root)",
		(instance: Argv) => {
			return instance
				.command(require("./commands/inbox/processEthSide"))
				.command(require("./commands/inbox/processRootSide"));
		}
	)
	.command(
		"outbox <commands>",
		"Group of commands that handle outgoing events (Root->Eth)",
		(instance: Argv) => {
			return instance
				.command(require("./commands/outbox/processRootSide"))
				.command(require("./commands/outbox/processEthSide"));
		}
	)
	.command(
		"debug <commands>",
		"Group of commands to debug the bridge daemon",
		(instance: Argv) => {
			return instance
				.command(require("./commands/debug/relayDepositEvent"))
				.command(require("./commands/debug/relayWithdrawEvent"))
				.command(require("./commands/debug/verifyEventSignature"))
				.command(require("./commands/debug/fetchEventProof"));
			// .command(require("./commands/debug/updateSquidStatus"))
			// .command(require("./commands/debug/updateEthStatus"));
		}
	)

	.demandCommand()
	.help().argv;
