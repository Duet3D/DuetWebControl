// Slim editor.api entry + the editor contribs DWC actually uses. The bulk `monaco-editor` /
// `editor.main` entry would eagerly pull in the CSS/HTML/JSON/TS language services (each with
// its own web worker) plus ~80 built-in tokenizers, ballooning the monaco chunk and emitting
// multiple worker assets. Adding a contrib here is cheap; removing one drops its code
import * as monaco from "monaco-editor-core/esm/vs/editor/editor.api.js";
import "monaco-editor-core/esm/vs/editor/browser/coreCommands.js";
import "monaco-editor-core/esm/vs/editor/browser/widget/codeEditor/codeEditorWidget.js";

import "monaco-editor-core/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching.js";
import "monaco-editor-core/esm/vs/editor/contrib/clipboard/browser/clipboard.js";
import "monaco-editor-core/esm/vs/editor/contrib/comment/browser/comment.js";
import "monaco-editor-core/esm/vs/editor/contrib/contextmenu/browser/contextmenu.js";
import "monaco-editor-core/esm/vs/editor/contrib/cursorUndo/browser/cursorUndo.js";
import "monaco-editor-core/esm/vs/editor/contrib/dnd/browser/dnd.js";
import "monaco-editor-core/esm/vs/editor/contrib/find/browser/findController.js";
import "monaco-editor-core/esm/vs/editor/contrib/folding/browser/folding.js";
import "monaco-editor-core/esm/vs/editor/contrib/fontZoom/browser/fontZoom.js";
import "monaco-editor-core/esm/vs/editor/contrib/hover/browser/hoverContribution.js";
import "monaco-editor-core/esm/vs/editor/contrib/inPlaceReplace/browser/inPlaceReplace.js";
import "monaco-editor-core/esm/vs/editor/contrib/indentation/browser/indentation.js";
import "monaco-editor-core/esm/vs/editor/contrib/lineSelection/browser/lineSelection.js";
import "monaco-editor-core/esm/vs/editor/contrib/linesOperations/browser/linesOperations.js";
import "monaco-editor-core/esm/vs/editor/contrib/links/browser/links.js";
import "monaco-editor-core/esm/vs/editor/contrib/multicursor/browser/multicursor.js";
import "monaco-editor-core/esm/vs/editor/contrib/parameterHints/browser/parameterHints.js";
import "monaco-editor-core/esm/vs/editor/contrib/placeholderText/browser/placeholderText.contribution.js";
import "monaco-editor-core/esm/vs/editor/contrib/smartSelect/browser/smartSelect.js";
import "monaco-editor-core/esm/vs/editor/contrib/stickyScroll/browser/stickyScrollContribution.js";
import "monaco-editor-core/esm/vs/editor/contrib/suggest/browser/suggestController.js";
import "monaco-editor-core/esm/vs/editor/contrib/tokenization/browser/tokenization.js";
import "monaco-editor-core/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter.js";
import "monaco-editor-core/esm/vs/editor/contrib/wordOperations/browser/wordOperations.js";

// Standalone quick-access providers power the F1 command palette and Ctrl+G go-to-line pickers
import "monaco-editor-core/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js";
import "monaco-editor-core/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js";
// "Developer: Inspect Tokens" action (handy when tuning the Monarch tokenizer colours)
import "monaco-editor-core/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js";

// Minimal JSON tokenizer - monaco-editor 0.55 no longer ships a basic-languages entry for JSON,
// and the full language service eagerly pulls in every editor contrib (codeAction, inlayHints,
// rename, semanticTokens, ...) plus its own web worker. DWC only needs syntax coloring for a
// handful of config files, so register a small Monarch grammar instead
monaco.languages.register({ id: "json", extensions: [".json"], aliases: ["JSON", "json"], mimetypes: ["application/json"] });
monaco.languages.setMonarchTokensProvider("json", {
	tokenizer: {
		root: [
			[/[{}\[\],:]/, "delimiter"],
			[/"(?:[^"\\]|\\.)*"/, "string"],
			[/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number"],
			[/\b(?:true|false|null)\b/, "keyword"],
			[/\s+/, "white"]
		]
	}
});
monaco.languages.setLanguageConfiguration("json", {
	brackets: [["{", "}"], ["[", "]"]],
	autoClosingPairs: [{ open: "{", close: "}" }, { open: "[", close: "]" }, { open: "\"", close: "\"" }],
	surroundingPairs: [{ open: "{", close: "}" }, { open: "[", close: "]" }, { open: "\"", close: "\"" }]
});

export { monaco };
