import assert from "assert";
import { createObjectCsvWriter } from "csv-writer";
import type { CsvWriter } from "csv-writer/src/lib/csv-writer";
import type { ObjectCsvWriterParams } from "csv-writer/src/lib/csv-writer-factory";
import csvReader from "csvtojson";
import fs, { createWriteStream } from "fs";
import { camelCase, startCase } from "lodash";
import * as path from "path";

interface CsvReader<T> {
	readRecords: () => Promise<Array<T>>;
}

export class CsvParser<T extends object> {
	path: string;
	headings?: Array<string>;
	reader?: CsvReader<T>;
	writer?: CsvWriter<T>;

	constructor(filename: string, headings?: Array<string>) {
		const filePath = path.resolve(__dirname, `../data/${filename}.csv`);

		if (!fs.existsSync(filePath)) {
			createWriteStream(filePath);
		}

		this.headings = headings;
		this.path = path.resolve(__dirname, `../data/${filename}.csv`);

		// if (!fs.existsSync(this.path)) throw new Error("CSV Data directory missing");
	}

	getReader() {
		return (this.reader = {
			readRecords: async () =>
				this.parseHeader(await csvReader().fromFile(this.path)) as Array<T>,
		});
	}

	async read() {
		if (!this?.reader) this.getReader();

		return await this.reader!.readRecords();
	}

	getWriter(params?: Omit<ObjectCsvWriterParams, "path" | "header">) {
		return (this.writer = createObjectCsvWriter({
			...params,
			path: this.path,
			header: this.createHeader(),
		}));
	}

	async write(records: Array<T>) {
		if (!this?.writer) this.getWriter();

		return await this.writer!.writeRecords(records);
	}

	createHeader() {
		assert(this.headings, "CsvParser headings must be defined to use writer");

		return this.headings.map((heading) => ({
			id: heading,
			title: startCase(heading),
		}));
	}

	parseHeader(records: Array<Record<string, unknown>>) {
		return records.map((record) => {
			const headings = Object.keys(record);

			return headings.reduce((acc, heading) => {
				const data = record[heading];
				try {
					record[heading] = JSON.parse(data as string);
				} catch (_) {
					// noop
				}

				return {
					...acc,
					[camelCase(heading)]: record[heading],
				};
			}, {});
		});
	}
}
