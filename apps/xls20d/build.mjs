import { build } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

await build({
	entryPoints: ["src/index.ts", "src/main.ts", "src/server.ts"],
	bundle: true,
	platform: "node",
	target: ["node18"],
	outdir: "lib",
	plugins: [esbuildPluginPino({ transports: ["pino-slack-transport"] })],
});
