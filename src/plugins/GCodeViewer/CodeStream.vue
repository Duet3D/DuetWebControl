<style>
.gcode-exec-line {
	background-color: rgba(255, 213, 79, 0.22);
	box-shadow: inset 3px 0 0 0 #ffb300;
}
</style>

<template>
	<div class="editor-monaco" @mouseup="cursorChange" @keydown="cursorChange" @keyup="cursorChange">
		<div v-if="monacoLoading" class="d-flex justify-center align-center fill-height">
			<v-progress-circular indeterminate color="primary" />
		</div>
		<div ref="editorHost" class="fill-height" />
	</div>
</template>

<script setup lang="ts">
import type * as Monaco from "monaco-editor-core";

import { useSettingsStore } from "@/stores/settings";
import { ensureMonaco } from "@/utils/monaco";

const props = defineProps<{
	shown: boolean;
	currentline: number;
	document: string;
	isSimulating?: boolean;
}>();

const emit = defineEmits<{
	changed: [position: number];
}>();

const settingsStore = useSettingsStore();

const editorHost = ref<HTMLElement | null>(null);
const monacoLoading = ref(false);
// editor instance is intentionally not reactive; Vue's proxy would walk Monaco's internals and
// disturb its widget-position bookkeeping. We keep it as a module-scope variable instead
let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
let innerDocument = " ";

// Whole-line decoration marking the line currently being executed
let executionLine: Monaco.editor.IEditorDecorationsCollection | null = null;

function cursorChange() {
	if (props.isSimulating || !editor) {
		return;
	}
	const currentPosition = editor.getPosition() ?? { lineNumber: 1, column: 9999 };
	const position = editor.getModel()?.getOffsetAt({
		lineNumber: currentPosition.lineNumber,
		column: 9999,
	}) ?? 0;
	emit("changed", position);
}

/** Highlight the line currently being executed and keep it in view */
function followPosition() {
	if (!props.shown || !editor) {
		return;
	}
	const model = editor.getModel();
	if (!model) {
		return;
	}
	const target = model.getPositionAt(props.currentline);

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
	const monaco = await ensureMonaco();
	monacoLoading.value = false;
	nextTick(() => {
		if (!editorHost.value) {
			return;
		}
		editor = monaco.editor.create(editorHost.value, {
			automaticLayout: true,
			language: "gcode",
			scrollBeyondLastLine: false,
			theme: settingsStore.darkTheme ? "vs-dark" : "vs",
			value: innerDocument,
			readOnly: true,
			occurrencesHighlight: "off",
			matchBrackets: "never",
			minimap: { enabled: false },
		});
		executionLine = editor.createDecorationsCollection();
		editor.focus();
		followPosition();
	});
});

onBeforeUnmount(() => {
	editor?.dispose();
	editor = null;
	executionLine = null;
});

watch(() => props.currentline, followPosition);

watch(() => props.document, (to) => {
	innerDocument = to;
	if (editor) {
		editor.setValue(innerDocument);
		followPosition();
	}
});
</script>
