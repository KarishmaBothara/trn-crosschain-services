export interface SubmitOptions {
	maxRetry?: number;
	log: { warn: (message: string) => void; info?: (message: string) => void };
}

const RETRYABLE_ERRORS = [
	"Operation timed out (os error 110)",
	"unexpected end of file",
];

/**
Executes a given async function with the ability to retry a specified number of times based on certain error conditions.

@template T - The type of the result of the async function.
@param {() => Promise<T>} call - The async function to execute.
@param {SubmitOptions} options - The options object that contains the retry count and logging functions.
@returns {Promise<T | void>} - The result of the async function or void if the function did not return a value.
*/
export async function submitTransaction<T>(
	call: () => Promise<T>,
	{ maxRetry: retries = 3, log }: SubmitOptions
): Promise<T | void> {
	let retryCount = 0;

	do {
		const [result, error, retryPhrase]: [T, unknown, string?] =
			await call().then(
				(result: T) => [result, null],
				(error) => {
					const { message } = error as unknown as { message: string };
					const retryPhrase = RETRYABLE_ERRORS.find(
						(phrase) => message.indexOf(phrase) >= 0
					);
					if (!retryPhrase) return [null as T, error, retryPhrase];
					return [null as T, error, retryPhrase];
				}
			);

		if (result) return result;
		if (error && !retryPhrase) throw error;
		if (retryCount++ === retries) throw error;
		log.warn(
			`Retry the call as message is whitelisted, message: ${retryPhrase}", retryCount: ${retryCount}, maxRetry: ${retries}`
		);
		// eslint-disable-next-line no-constant-condition
	} while (true);
}
