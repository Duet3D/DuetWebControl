<!-- Monaco-backed editor for a single file on the machine. Loads the file content on mount,
	 owns the Monaco editor instance, and offers save + revert + close actions. Lazy-imports
	 monaco-editor and @duet3d/monacotokens on first use so they land in their own chunks -->
<template>
	<div class="monaco-editor-host">
		<v-toolbar density="compact" color="surface" class="px-2">
			<v-icon class="mr-2">{{ languageIcon }}</v-icon>
			<v-toolbar-title class="text-body-1 text-truncate">
				{{ filename }}
				<span v-if="dirty" class="text-warning">*</span>
			</v-toolbar-title>

			<v-spacer />

			<v-btn variant="text" :disabled="!dirty || saving || loading" :loading="saving"
				   :title="$t('dialog.fileEdit.save')" @click="save">
				<v-icon class="mr-1">mdi-content-save</v-icon>
				<span class="hidden-xs-only">{{ $t("dialog.fileEdit.save") }}</span>
			</v-btn>

			<v-btn variant="text" :disabled="!dirty || saving || loading" :title="$t('dialog.fileEdit.revert')"
				   @click="revert">
				<v-icon>mdi-restore</v-icon>
			</v-btn>

			<v-btn variant="text" :title="$t('generic.close')" @click="requestClose">
				<v-icon>mdi-close</v-icon>
			</v-btn>
		</v-toolbar>

		<div v-if="loading" class="d-flex justify-center align-center editor-pane">
			<v-progress-circular indeterminate color="primary" />
		</div>
		<div v-else-if="loadError" class="d-flex justify-center align-center editor-pane pa-4">
			<v-alert type="error" class="mb-0">{{ loadError }}</v-alert>
		</div>
		<div v-show="!loading && !loadError" ref="container" class="editor-pane" />

		<ConfirmDialog v-model:shown="discardDialog.shown" :title="$t('dialog.fileEdit.discardTitle')"
					   :prompt="$t('dialog.fileEdit.discardPrompt')" icon="mdi-alert"
					   @confirmed="forceClose" />
	</div>
</template>

<script setup lang="ts">
import { MachineMode } from "@duet3d/objectmodel";
import type * as Monaco from "monaco-editor";

import ConfirmDialog from "@/components/dialogs/ConfirmDialog.vue";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { LogLevel, useUiStore } from "@/stores/ui";
import { useSettingsStore } from "@/stores/settings";
import { getErrorMessage } from "@/utils/errors";
import Path from "@/utils/path";

const props = defineProps<{
	filename: string;
	/**
	 * Optional pre-fetched file content (typically supplied by a route data loader). When set,
	 * the on-mount download is skipped and the editor opens with this text already loaded
	 */
	initialContent?: string;
}>();

const emit = defineEmits<{
	close: [];
	saved: [filename: string];
}>();

const machineStore = useMachineStore();
const uiStore = useUiStore();
const settingsStore = useSettingsStore();

const container = ref<HTMLDivElement | null>(null);
const loading = ref(true);
const saving = ref(false);
const loadError = ref<string | null>(null);
const dirty = ref(false);

let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
let originalValue = "";
let detachGcodeFeatures: Monaco.IDisposable | null = null;

const language = computed(() => detectLanguage(props.filename, machineStore.model.directories,
	machineStore.model.state.machineMode));

const languageIcon = computed(() => {
	switch (language.value) {
		case "gcode-fdm":
		case "gcode-cnc":
			return "mdi-code-tags";
		case "json":
			return "mdi-code-json";
		case "stm32":
		case "menu":
			return "mdi-file-document";
		default:
			return "mdi-file-document-edit";
	}
});

const discardDialog = reactive({ shown: false });

onMounted(async () => {
	try {
		const monaco = await ensureMonaco(machineStore);

		// Fetch the file content first; building the editor with the wrong content forces a
		// second model swap once it lands which is visually noisy. A route data loader may have
		// already pre-fetched the text, in which case we skip the download
		let content = props.initialContent ?? "";
		if (props.initialContent === undefined) {
			try {
				content = await machineStore.download({ filename: props.filename, type: "text" }, false, false, false);
			} catch (e) {
				loadError.value = getErrorMessage(e);
				loading.value = false;
				return;
			}
		}

		originalValue = content;

		if (!container.value) {
			return;
		}
		editor = monaco.editor.create(container.value, {
			value: content,
			language: language.value,
			theme: settingsStore.darkTheme ? "vs-dark" : "vs",
			automaticLayout: true,
			minimap: { enabled: false },
			tabSize: 4,
			scrollBeyondLastLine: false,
		});

		editor.onDidChangeModelContent(() => {
			dirty.value = editor!.getValue() !== originalValue;
		});

		if (language.value === "gcode-fdm" || language.value === "gcode-cnc") {
			const { attachGcodeFeatures } = await import("@duet3d/monacotokens");
			detachGcodeFeatures = attachGcodeFeatures(monaco, editor);
		}

		loading.value = false;
	} catch (e) {
		loadError.value = getErrorMessage(e);
		loading.value = false;
	}
});

onBeforeUnmount(() => {
	detachGcodeFeatures?.dispose();
	editor?.dispose();
	editor = null;
});

watch(() => settingsStore.darkTheme, (dark) => {
	if (editor) {
		import("monaco-editor").then((monaco) => {
			monaco.editor.setTheme(dark ? "vs-dark" : "vs");
		}).catch(() => {});
	}
});

async function save() {
	if (!editor || saving.value) {
		return;
	}
	saving.value = true;
	try {
		const content = editor.getValue();
		await machineStore.upload({ filename: props.filename, content: new Blob([content]) }, false, false);
		originalValue = content;
		dirty.value = false;
		emit("saved", props.filename);
	} catch (e) {
		console.warn(e);
		uiStore.log(LogLevel.error, i18n.global.t("dialog.fileEdit.saveFailed", [props.filename]),
			getErrorMessage(e));
	} finally {
		saving.value = false;
	}
}

function revert() {
	if (editor) {
		editor.setValue(originalValue);
		dirty.value = false;
	}
}

function requestClose() {
	if (dirty.value) {
		discardDialog.shown = true;
		return;
	}
	emit("close");
}

function forceClose() {
	emit("close");
}

// ---- Helpers --------------------------------------------------------------------------------

interface DirectoriesShape {
	macros: string;
	menu: string;
}

function detectLanguage(filename: string, directories: DirectoriesShape, machineMode: MachineMode | null): string {
	if (Path.startsWith(filename, directories.macros) || /\.(g|gcode|gc|gco|nc|ngc|tap)(\.bak)?$/i.test(filename)) {
		return machineMode === MachineMode.cnc ? "gcode-cnc" : "gcode-fdm";
	}
	if (/\.json$/i.test(filename)) {
		return "json";
	}
	if (Path.startsWith(filename, directories.menu)) {
		return "menu";
	}
	if (Path.equals(filename, Path.boardFile)) {
		return "stm32";
	}
	return "plaintext";
}

let monacoSetup: Promise<typeof Monaco> | null = null;
async function ensureMonaco(store: ReturnType<typeof useMachineStore>): Promise<typeof Monaco> {
	if (!monacoSetup) {
		monacoSetup = (async () => {
			const [monaco, tokens] = await Promise.all([
				import("monaco-editor"),
				import("@duet3d/monacotokens"),
			]);
			tokens.registerDuetLanguages(monaco);
			tokens.setMachineContext({ model: store.model });
			return monaco;
		})();
	}
	return monacoSetup;
}
</script>

<style scoped>
.monaco-editor-host {
	display: flex;
	flex-direction: column;
	height: 70vh;
	min-height: 400px;
}

.editor-pane {
	flex: 1 1 auto;
	min-height: 0;
}
</style>
