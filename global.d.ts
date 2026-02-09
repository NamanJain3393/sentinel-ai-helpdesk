declare module "papaparse" {
	namespace Papa {
		interface ParseResult<T> {
			data: T[];
			errors: Array<{ type: string; code: string; message: string; row?: number }>;
			meta: any;
		}

		interface ParseConfig<T = any> {
			header?: boolean;
			delimiter?: string;
			dynamicTyping?: boolean;
			skipEmptyLines?: boolean | "greedy";
			complete?: (results: ParseResult<T>) => void;
		}

		function parse<T = any>(input: string | File | Blob, config?: ParseConfig<T>): ParseResult<T>;
	}

	export = Papa;
}

