import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

monaco.languages.register({ id: "menu" });
monaco.languages.setMonarchTokensProvider("menu", {
	keywords: ["image", "text", "button", "value", "alter", "files"],
	symbols:  /[=><!~?:&|+\-*#\/\^%]+/,
	operators: ['*', '/', '+', '-', "==", "!=", '=', "<=", '<', ">=", ">>>", ">>", '>', '!', "&&", '&', "||", '|', '^', '?', ':'],
	includeLF: true,
	tokenizer: {
		root: [
			// keywords
			[/[a-z_$][\w$]*/, {
				cases: {
					"@keywords": { token: "keyword" },
				}
			}],
			// numbers
			[/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
			[/0[xX][0-9a-fA-F]+/, "number.hex"],
			[/\d+/, "number"],

			// strings
			[/"(.|\"\")*?"/, "string"],

			// comments
			[/;.*/, "comment"],

			// parameter letters
			[/'?[A-Z]/, "keyword"],
			[/'[a-z]/, "keyword"]
		]
	}
});
