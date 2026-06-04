<style>
.gcode-exec-line {
	background-color: rgba(255, 213, 79, 0.22);
	box-shadow: inset 3px 0 0 0 #ffb300;
}
</style>

<style scoped>
.gcode-stream {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-height: 320px;
}

.editor-host {
	flex: 1 1 auto;
}
</style>

<template>
	<div class="gcode-stream">
		<div v-if="monacoLoading" class="d-flex justify-center align-center flex-grow-1">
			<v-progress-circular indeterminate color="primary" />
		</div>
		<div ref="editorHost" class="editor-host" />
	</div>
</template>

<script setup lang="ts">
import type * as Monaco from "monaco-editor-core";

import i18n from "@/i18n";
import { useJobFileStore } from "@/stores/jobFile";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import { ensureMonaco } from "@/utils/monaco";

const jobFileStore = useJobFileStore();
const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const editorHost = ref<HTMLElement | null>(null);
const monacoLoading = ref(false);

// The editor instance and the resolved monaco namespace are intentionally not reactive:
// Vue's proxy would walk Monaco's internals and disturb its widget-position bookkeeping
let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
let monacoNamespace: typeof Monaco | null = null;

// Whole-line decoration marking the line currently being executed
let executionLine: Monaco.editor.IEditorDecorationsCollection | null = null;

/** Push the shared cached job file content into the editor */
function syncEditor() {
	if (!editor) {
		return;
	}
	editor.setValue(jobFileStore.content);
	if (jobFileStore.content) {
		followPosition();
	} else {
		executionLine?.clear();
	}
}

/** Highlight the line currently being executed and keep it in view */
function followPosition() {
	if (!editor) {
		return;
	}
	const model = editor.getModel();
	if (!model) {
		return;
	}
	const offset = Number(machineStore.model.job.filePosition ?? 0);
	const target = model.getPositionAt(offset);

	executionLine?.set([{
		range: { startLineNumber: target.lineNumber, startColumn: 1, endLineNumber: target.lineNumber, endColumn: 1 },
		options: { isWholeLine: true, className: "gcode-exec-line" },
	}]);

	const current = editor.getPosition() ?? { lineNumber: 1, column: 1 };
	if (current.lineNumber === target.lineNumber) {
		return;
	}
	const direction = Math.sign(target.lineNumber - current.lineNumber);
	editor.setPosition({ lineNumber: target.lineNumber, column: 9999 });
	editor.revealLine(target.lineNumber + 5 * direction);
}

onMounted(async () => {
	monacoLoading.value = true;
	monacoNamespace = await ensureMonaco(machineStore);
	monacoLoading.value = false;

	await nextTick();
	if (!editorHost.value) {
		return;
	}
	editor = monacoNamespace.editor.create(editorHost.value, {
		value: "",
		language: uiStore.isFFF ? "gcode-fdm" : "gcode-cnc",
		theme: settingsStore.darkTheme ? "vs-dark" : "vs",
		placeholder: i18n.global.t("jobViewPanel.noFileLoaded"),
		readOnly: true,
		automaticLayout: true,
		scrollBeyondLastLine: false,
		occurrencesHighlight: "off",
		matchBrackets: "never",
		minimap: { enabled: false },
	});
	executionLine = editor.createDecorationsCollection();
	syncEditor();
	jobFileStore.loadContent();
});

onBeforeUnmount(() => {
	editor?.dispose();
	editor = null;
	executionLine = null;
});

watch(() => machineStore.model.job.file?.fileName, () => jobFileStore.loadContent());
watch(() => jobFileStore.content, syncEditor);
watch(() => machineStore.model.job.filePosition, followPosition);
watch(() => settingsStore.darkTheme, (dark) => {
	monacoNamespace?.editor.setTheme(dark ? "vs-dark" : "vs");
});
</script>
