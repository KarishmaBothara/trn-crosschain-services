import type { ChildProcessWithoutNullStreams } from "child_process";

export function handleChildProcesses(
	server: ChildProcessWithoutNullStreams,
	processor: ChildProcessWithoutNullStreams
) {
	const exit = (code: number) => {
		server.kill();
		processor.kill();
		process.exit(code ?? 0);
	};

	const handleChildProcess = (
		child: ChildProcessWithoutNullStreams,
		name: string
	) => {
		const log = (message: string) => console.log(`${name}:\n${message}`);

		child.stdout.on("data", (data) => {
			log(data);
		});

		child.stderr.on("data", (data) => {
			log(data.toString());
		});

		child.on("error", (error) => {
			log(error.message);
		});

		child.on("close", (code) => {
			exit(code ?? 0);
		});
	};

	handleChildProcess(server, "Server");
	handleChildProcess(processor, "Processor");
}
