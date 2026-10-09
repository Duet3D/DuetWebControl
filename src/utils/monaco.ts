/**
 * Shared monaco-editor loader. Wires the global `MonacoEnvironment.getWorker` (Monaco refuses to
 * spin up workers without it) and registers the Duet language tokenizers exactly once per
 * session, so any editor consumer (MonacoEditor, CodeStream) gets a ready-to-use monaco namespace
 */
import type * as Monaco from "monaco-editor-core";
import { watch } from "vue";

import { getObjectModelDescription } from "@/utils/objectModelDoc";

import type { useMachineStore } from "@/stores/machine";

let monacoSetup: Promise<typeof Monaco> | null = null;
let machineContextBound = false;

export function ensureMonaco(machineStore?: ReturnType<typeof useMachineStore>): Promise<typeof Monaco> {
	if (!monacoSetup) {
		monacoSetup = (async () => {
			const editorWorker = (await import("./monaco-worker?worker")).default;
			self.MonacoEnvironment = {
				getWorker: () => new editorWorker(),
			};

			const [{ monaco }, tokens] = await Promise.all([
				import("./monaco-init"),
				import("@duet3d/monacotokens"),
			]);
			tokens.registerDuetLanguages(monaco);
			return monaco as unknown as typeof Monaco;
		})();

		// Drop a rejected setup so the next caller starts over. Boards under load do drop chunk
		// requests, and keeping the rejection cached would leave every editor broken until reload
		monacoSetup.catch(() => {
			monacoSetup = null;
			machineContextBound = false;
		});
	}

	// Feed the live object model to the completion/hover providers. Kept out of the one-shot setup
	// above because the first ensureMonaco() caller may not pass a store (e.g. the read-only
	// GCodeViewer) and because the machine store swaps in a fresh model object on disconnect - a
	// one-time snapshot would go stale, so we re-bind whenever the model reference changes
	if (machineStore && !machineContextBound) {
		machineContextBound = true;
		void monacoSetup.then(async () => {
			const tokens = await import("@duet3d/monacotokens");
			watch(() => machineStore.model, (model) => tokens.setMachineContext({ model, getObjectModelDescription }), { immediate: true });
		}).catch(() => { /* reported wherever ensureMonaco was awaited */ });
	}

	return monacoSetup;
}

/**
 * Resolve the per-editor G-code helpers: `attachGcodeFeatures` wires completion, hover and the
 * duet.searchGcode action onto one editor instance, the other two derive cursor context from a line.
 * Async so that neither this module nor anything importing it pulls monacotokens into its chunk
 */
export async function ensureGcodeFeatures(): Promise<Pick<typeof import("@duet3d/monacotokens"), "attachGcodeFeatures" | "isInsideExpression" | "findCodeAtCursor">> {
	const { attachGcodeFeatures, isInsideExpression, findCodeAtCursor } = await import("@duet3d/monacotokens");
	return { attachGcodeFeatures, isInsideExpression, findCodeAtCursor };
}

/**
 * Hand a freshly created editor its first viewport so Monaco tokenizes what is on screen. The view
 * reports visible line ranges only after a scroll, an edit or this call, so a file that fits on
 * screen has none, and the idle-time background tokenizer is then the only path to any tokens at
 * all - one that a busy page can starve indefinitely, leaving the buffer unhighlighted. Waits for a
 * non-zero height because an editor built inside a hidden container reports an empty viewport.
 */
export function primeViewportTokens(editor: Monaco.editor.ICodeEditor): void {
	if (editor.getLayoutInfo().height > 0) {
		editor.handleInitialized?.();
		return;
	}
	const listener = editor.onDidLayoutChange((layout) => {
		if (layout.height > 0) {
			listener.dispose();
			editor.handleInitialized?.();
		}
	});
}
