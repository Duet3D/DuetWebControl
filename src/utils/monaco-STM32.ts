import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

monaco.languages.register({ id: "STM32" });
monaco.languages.setMonarchTokensProvider("STM32", {
	keywordsPrimary: ["8266wifi","accelerometer","atx","board","heat","lcd","led","leds","pins","power","sbc","sdCard","serial","SPI0","SPI1","SPI2","SPI3","SPI4","SPI5","SPI6","SPI7","SPI8","stepper"],
	keywordsSecondary: ["clockReg","csPin","espDataReadyPin","espResetPin","TfrReadyPin","serialRxTxPins","spiChannel","initialPowerOn","powerPin","powerPinInverted","spiTempSensorChannel","spiTempSensorCSPins","tempSensePins","thermistorSeriesResistor","encoderPinA","encoderPinB","encoderPinSw","lcdBeepPin","lcdCSPin","lcdDCPin","panelButtonPin","neopixelPin","activity","activityOn","diagnostic","diagnosticOn","SetHigh","SetLow","VInDetectPin","voltage","loadConfig","external","internal","aux","aux2","pins","directionPins","enablePins","numSmartDrivers","num5160Drivers","stepPins","TmcDiagPins","TmcUartPins"],
	keywordsTertiary: ["cardDetectPin","csPin","spiChannel","spiFrequencyHz","spiFrequencyHz","rxTxPins","rxTxPins"],
	symbols:  /[=><!~?:&|+\-*#\/\^%]+/,
	operators: ['*', '/', '+', '-', "==", "!=", '=', "<=", '<', ">=", ">>>", ">>", '>', '!', "&&", '&', "||", '|', '^', '?', ':'],
	includeLF: true,
	tokenizer: {
		root: [
			// keywords
			[/[a-zA-Z0-9_$][\w$]*/, {
				cases: {
					"@keywordsPrimary": { token: "keyword" },
					"@keywordsSecondary": { token: "keyword" },
					"@keywordsTertiary": { token: "keyword" }
				}
			}],

			// comments
			[/\/\/.*/, "comment"],
			[/;.*/, "comment"],
			
			// expressions
			[/{/, "operator", "@curlyBracket"],

			// expressions
			[/=/, "operator", "@equals"],
		],
		expression: [
			
			// numbers
			[/\d+/, "number"],

			// Pin Numbers
			[/[a-iA-I]\.\d+/, "string"],
			[/[a-iA-I]\_\d+/, "string"],
			[/[a-iA-I]\d+/, "string"],
			[/P[a-iA-I]\.\d+/, "string"],
			[/P[a-iA-I]\_\d+/, "string"],
			[/P[a-iA-I]\d+/, "string"],
			[/NoPin/, "string"],

			// strings
			[/"(.|\"\")*?"/, "string"],

			[/[a-zA-Z0-9_$][\w$]*/, "string"],

			// operators
			[/@symbols/, {
				cases: {
					"@operators": "operator",
					"@default": ""
				}
			}],
			
			// comments
			[/;.*/, "comment"],

			// EOL
			[/\n/, "", "@popall"],
		],
		curlyBracket: [
			// curly brackets contain expressions
			{ include: "expression" },

			// terminate whern reaching a closing brackets
			[/}/, "operator", "@pop"],
		],
		equals: [
			// curly brackets contain expressions
			{ include: "expression" },
			// EOL
			[/\n/, "", "@popall"],
		]
	}
});