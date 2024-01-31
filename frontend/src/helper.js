export function stringify(obj) {
	const jsonString = JSON.stringify(obj, null, 2); // The third argument (2) adds indentation for better readability
	const stringWithoutSymbols = jsonString.replace(/[{}":\r\n\t]/g, "");
	return stringWithoutSymbols.toLowerCase();
}
