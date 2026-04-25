<!-- Read-only Monaco editor showing the gcode being simulated by the viewer. Tracks the
	 viewer's current position via `currentline`; in live (non-simulating) mode the user can
	 click to reposition the simulation by emitting the new file offset -->
<template>
	<div class="editor-monaco" @mouseup="cursorChange" @keydown="cursorChange" @keyup="cursorChange">
		<div v-if="monacoLoading" class="d-flex justify-center align-center fill-height">
			<v-progress-circular indeterminate color="primary" />
		</div>
		<div ref="editorHost" class="fill-height" />
	</div>
</template>

<script setup lang="ts">
import type * as Monaco from "monaco-editor";

import { useSettingsStore } from "@/stores/settings";

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

function cursorChange() {
	if (props.isSimulating || !editor) return;
	const currentPosition = editor.getPosition() ?? { lineNumber: 1, column: 9999 };
	const position = editor.getModel()?.getOffsetAt({
		lineNumber: currentPosition.lineNumber,
		column: 9999,
	}) ?? 0;
	emit("changed", position);
}

onMounted(async () => {
	monacoLoading.value = true;
	const monaco = await import("monaco-editor");
	monacoLoading.value = false;
	nextTick(() => {
		if (!editorHost.value) return;
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
		editor.focus();
	});
});

onBeforeUnmount(() => {
	editor?.dispose();
	editor = null;
});

watch(() => props.currentline, (to) => {
	if (!props.shown || !editor) return;
	const currentPosition = editor.getPosition() ?? { lineNumber: 1, column: 9999 };
	const position = editor.getModel()?.getPositionAt(to) ?? { lineNumber: 1, column: 9999 };
	if (currentPosition.lineNumber === position.lineNumber && currentPosition.column === position.column) {
		return;
	}
	const direction = Math.sign(position.lineNumber - currentPosition.lineNumber);
	const newpos = { lineNumber: position.lineNumber, column: 9999 };
	editor.setPosition(newpos);
	editor.revealLine(newpos.lineNumber + 5 * direction);
});

watch(() => props.document, (to) => {
	innerDocument = to;
	if (editor) {
		editor.setValue(innerDocument);
	}
});
</script>

<style>
.cm-activeLine {
	background-color: #333 !important;
}
</style>
