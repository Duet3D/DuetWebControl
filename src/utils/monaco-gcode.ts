import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

/**
 * Set the options for the Monaco G-code language tokenizer
 * @param cncMode If true, comments in parentheses are allowed
 */
export function setMonacoGCodeOptions(fdmMode: boolean) {
	monaco.languages.setMonarchTokensProvider("gcode", {
		consts: ["true", "false", "iterations", "line", "null", "pi", "result", "input"],
		functions: ["abs", "acos", "asin", "atan", "atan2", "cos", "degrees", "exists", "fileexists", "fileread", "floor", "isnan", "max",
			"min", "mod", "radians", "random", "sin", "sqrt", "tan", "vector"],
		keywords: ["abort", "echo", "if", "elif", "while", "set"],
		noArgKeywords: ["else", "break", "continue"],
		varKeywords: ["global", "var"],
		symbols: /[=><!~?:&|+\-*#\/\^%]+/,
		operators: ['*', '/', '+', '-', "==", "!=", '=', "<=", '<', ">=", ">>>", ">>", '>', '!', "&&", '&', "||", '|', '^', '?', ':'],
		includeLF: true,
		tokenizer: {
			root: [
				// G/M/T-codes
				[/[gG][01](?=\D)/, "keyword", fdmMode ? "normalGcode" : "moveGcode"],
				[/[gGmM]\d+(\.\d+)?/, "keyword", "normalGcode"],
				[/[tT]-?\d+/, "keyword", "normalGcodeWithT"],

				// meta keywords
				[/[a-z_$][\w$]*/, {
					cases: {
						"@keywords": { token: "keyword", next: "@lineExpression" },
						"@noArgKeywords": { token: "keyword" },
						"@varKeywords": { token: "keyword", next: "varName" }
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
				[/\(.*\)/, fdmMode ? "invalid" : "comment"]
			],
			gcode: [
				// next G/M/T-code
				[/[gG][0123](?=\D)/, "keyword", "moveGcode"],
				[/[gGmM]\d+(\.\d*)?/, "keyword", "normalGcode"],
				[/[tT]/, "keyword", "normalGcodeWithT"],

				// parameter letters
				[/'?[a-zA-Z]/, "keyword"],

				// expressions
				[/{/, "operator", "@curlyBracket"],

				// enclosed comments
				[/\(.*\)/, "comment"],

				// parameter expressions
				[/{/, "expression", "@expression"],

				// include defaults
				{ include: "root" }
			],
			moveGcode: [
				// stop if a T-code or a potential meta G-code command follows
				[/(?=([tT]|[a-zA-Z][a-zA-Z]))/, "keyword", "@popall"],

				// include normal gcode
				{ include: "gcode" }
			],
			normalGcode: [
				// include normal gcode
				{ include: "gcode" },

				// EOL
				[/\n/, "", "@popall"]
			],
			normalGcodeWithT: [
				// already had a T parameter, starting a new T-code
				[/(?=T)/, "keyword", "@popall"],

				// include normal gcode
				{ include: "normalGcode" }
			],
			expression: [
				// variables
				[/(global|param|var)\.[a-zA-Z]\w*/, "variable.name"],

				// object model properties
				[/(\w+\.(\w+\.?)*|\.\w+(\.\w+)*)/, "variable"],

				// consts and functions
				[/[a-z]\w*/, {
					cases: {
						"@consts": "constant",
						"@functions": "keyword"
					}
				}],

				// nested expressions
				[/{/, "operator", "@curlyBracket"],
				[/\[/, "operator", "@squareBracket"],

				// numbers
				[/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
				[/0[xX][0-9a-fA-F]+/, "number.hex"],
				[/\d+/, "number"],

				// strings and chars
				[/"(.|\"\")*?"/, "string"],
				[/'.'/, "string"],

				// operators
				[/@symbols/, {
					cases: {
						"@operators": "operator",
						"@default": ""
					}
				}],
			
				// final comment
				[/;.*/, "comment"],

				// EOL
				[/\n/, "", "@popall"],
			],
			lineExpression: [
				// comments
				[/;.*/, "comment"],

				// line expressions are basically expressions
				{ include: "expression" }
			],
			curlyBracket: [
				// curly brackets contain expressions
				{ include: "expression" },

				// terminate whern reaching a closing bracket
				[/}/, "operator", "@pop"],
			],
			squareBracket: [
				// square brackets contain expressions
				{ include: "expression" },

				// terminate whern reaching a closing bracket
				[/\]/, "operator", "@pop"],
			],
			varName: [
				// variable name
				[/[a-zA-Z_$][\w$]*/, "variable.name", "@expression"],

				// EOL
				[/\n/, "", "@popall"]
			]
		}
	});
}

// Register default gcode language in FDM mode
monaco.languages.register({ id: "gcode" });
setMonacoGCodeOptions(true);
