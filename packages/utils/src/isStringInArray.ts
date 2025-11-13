export function isStringInArray(
	searchString: string | undefined | null,
	stringArray: Array<string>
): boolean {
	return searchString &&
		stringArray.some(
			(str: string) => searchString.toLowerCase() === str.toLowerCase()
		)
		? true
		: false;
}
