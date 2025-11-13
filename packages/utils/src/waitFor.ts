/**
 * Wait for a number of ms before resolve a promise with an optinoal value
 *
 * @param {number} duration
 * @param {T} value
 * @return {Promise<T | void>}
 */
export async function waitFor(duration: number): Promise<void>;
export async function waitFor<T>(duration: number, value: T): Promise<T>;
export async function waitFor<T>(
	duration: number,
	value?: T
): Promise<T | void> {
	return new Promise((resolve) => {
		setTimeout(() => resolve(value), duration);
	});
}
