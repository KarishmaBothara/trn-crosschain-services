import { Logger } from "@subsquid/logger";
import { Client } from "xrpl";

import { waitFor } from "@trncs/utils/waitFor";

export function listenXRPClientWarning(xrplClient: Client, log: Logger) {
	xrplClient.on("error", (errorCode, errorMessage, data) => {
		log.error(`Error:: ${errorMessage}`);
		if (data) {
			log.error(data);
		}
	});

	xrplClient.connection.on("message", (message: string) => {
		let data;
		try {
			data = JSON.parse(message);
		} catch (error) {
			return;
		}

		if (data.warning) {
			log.warn(`Warning from rippled: ${data.warning}`);
		}
	});

	// https://github.com/XRPLF/xrpl.js/blob/5d34746f1241cc17d5ad08e0c1d6aa63d6743e42/packages/xrpl/src/client/connection.ts#L462
	xrplClient.connection.on("close", async (code?: number, reason?: Buffer) => {
		log.warn(`Websocket was closed ${code} ${reason}`);
		// If the connection is closed because of rate limiting, the close code is 1008
		if (code === 1008) {
			log.info("Daemon is waiting for 5 mins and is going to exit");
			await waitFor(300000); // 5 mins is 300000 ms
		} else {
			log.info("Daemon is waiting for 5 seconds");
			await waitFor(5000); // 5 second
		}
		process.exit(1);
	});
}
