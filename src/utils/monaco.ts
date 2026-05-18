/**
 * Shared monaco-editor loader. Wires the global `MonacoEnvironment.getWorker` (Monaco refuses to
 * spin up workers without it) and registers the Duet language tokenizers exactly once per
 * session, so any editor consumer (MonacoEditor, CodeStream) gets a ready-to-use monaco namespace
 */
import type * as Monaco from "monaco-editor";
import type { useMachineStore } from "@/stores/machine";

let monacoSetup: Promise<typeof Monaco> | null = null;

export function ensureMonaco(machineStore?: ReturnType<typeof useMachineStore>): Promise<typeof Monaco> {
	if (!monacoSetup) {
		monacoSetup = (async () => {
			const editorWorker = (await import("monaco-editor/esm/vs/editor/editor.worker?worker")).default;
			self.MonacoEnvironment = {
				getWorker: () => new editorWorker(),
			};

			const [monaco, tokens] = await Promise.all([
				import("monaco-editor"),
				import("@duet3d/monacotokens"),
			]);
			tokens.registerDuetLanguages(monaco);
			if (machineStore) {
				tokens.setMachineContext({ model: machineStore.model });
			}
			return monaco;
		})();
	}
	return monacoSetup;
}
