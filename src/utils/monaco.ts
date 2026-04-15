// Import monaco-editor's slim API entry (no built-in languages, no editor contribs) and opt in to just the pieces we use.
// This avoids the ~5 MB bulk of monaco-editor/esm/vs/editor/editor.main which eagerly imports ~80 basic-language tokenizers
// and the full CSS/HTML/TS/JSON language services
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/editor/browser/coreCommands";
import "monaco-editor/esm/vs/editor/browser/widget/codeEditor/codeEditorWidget";


// Editor UX contributions we actually use. Adding one here is cheap; removing one drops its code from the bundle
import "monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching";
import "monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard";
import "monaco-editor/esm/vs/editor/contrib/comment/browser/comment";
import "monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu";
import "monaco-editor/esm/vs/editor/contrib/cursorUndo/browser/cursorUndo";
import "monaco-editor/esm/vs/editor/contrib/dnd/browser/dnd";
import "monaco-editor/esm/vs/editor/contrib/find/browser/findController";
import "monaco-editor/esm/vs/editor/contrib/folding/browser/folding";
import "monaco-editor/esm/vs/editor/contrib/fontZoom/browser/fontZoom";
import "monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution";
import "monaco-editor/esm/vs/editor/contrib/inPlaceReplace/browser/inPlaceReplace";
import "monaco-editor/esm/vs/editor/contrib/indentation/browser/indentation";
import "monaco-editor/esm/vs/editor/contrib/lineSelection/browser/lineSelection";
import "monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations";
import "monaco-editor/esm/vs/editor/contrib/links/browser/links";
import "monaco-editor/esm/vs/editor/contrib/multicursor/browser/multicursor";
import "monaco-editor/esm/vs/editor/contrib/parameterHints/browser/parameterHints";
import "monaco-editor/esm/vs/editor/contrib/smartSelect/browser/smartSelect";
import "monaco-editor/esm/vs/editor/contrib/stickyScroll/browser/stickyScrollContribution";
import "monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController";
import "monaco-editor/esm/vs/editor/contrib/tokenization/browser/tokenization";
import "monaco-editor/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter";
import "monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations";

// Standalone quick-access providers power the F1 command palette and Ctrl+G go-to-line pickers
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess";
// "Developer: Inspect Tokens" action (handy when tuning the Monarch tokenizer colours)
import "monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens";

import { registerDuetLanguages } from "@duet3d/monacotokens";

self.MonacoEnvironment = {
	getWorker: function () {
		return new Worker(
			/* webpackChunkName: "monaco-worker" */
			new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url)
		);
	}
};

registerDuetLanguages(monaco);

// Minimal JSON tokenizer - monaco-editor 0.55 no longer ships a basic-languages entry for JSON, and the full language
// service eagerly pulls in every editor contrib (codeAction, inlayHints, rename, semanticTokens, ...) plus its own web
// worker. Since DWC only needs syntax coloring for a few config files, register a small Monarch grammar instead
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
