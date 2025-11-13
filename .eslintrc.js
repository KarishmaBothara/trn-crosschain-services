module.exports = {
	root: true,
	env: {
		node: true,
		es2021: true,
		jest: true
	},
	plugins: ["@typescript-eslint"],
	parser: "@typescript-eslint/parser",
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended",
		"prettier",
	],
	rules: {
		"@typescript-eslint/no-non-null-assertion": "off",
		"no-undef": "error",
	},
};
