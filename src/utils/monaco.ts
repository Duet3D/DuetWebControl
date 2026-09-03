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
		});
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
