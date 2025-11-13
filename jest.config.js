/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	moduleNameMapper: {
		"@trncs/ebd/(.*)$": ["<rootDir>/apps/ebd/src/$1"],
		"@trncs/xbd/(.*)$": ["<rootDir>/apps/xbd/src/$1"],
		"@trncs/xls20d/(.*)$": ["<rootDir>/apps/xls20d/src/$1"],
		"@trncs/balance-checker/(.*)$": ["<rootDir>/apps/balance-checker/$1"],
		"@trncs/utils/(.*)$": ["<rootDir>/packages/utils/src/$1"],
	},
	transform: {
		// '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
		// '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				isolatedModules: true,
			},
		],
	},
	setupFiles: ["dotenv/config"],
};
