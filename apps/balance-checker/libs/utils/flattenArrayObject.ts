type T = Record<string, unknown> | null;

export default function flattenArrayObject(array: T[]) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return array.filter(Boolean).flatMap((o: any) => Object.values(o));
}
