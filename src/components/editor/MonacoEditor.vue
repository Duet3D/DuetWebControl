<style scoped>
.monaco-editor-host {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 320px;
}

@media (min-width: 840px) {
	.monaco-editor-host {
		min-height: 400px;
	}
}

.monaco-editor-host--collapsed {
	height: auto;
	min-height: 0;
}

.editor-pane {
	flex: 1 1 auto;
	min-height: 0;
}

.editor-textarea {
	width: 100%;
	font-family: ui-monospace, "Cascadia Code", Menlo, Consolas, monospace;
	background: rgb(var(--v-theme-surface));
	color: rgb(var(--v-theme-on-surface));
	border: 0;
	padding: 8px;
	resize: none;
	outline: none;
	white-space: pre;
	overflow: auto;
	tab-size: 4;
}
</style>

<template>
	<div class="monaco-editor-host" :class="{ 'monaco-editor-host--collapsed': !!loadError }"
		 @dragover.capture.prevent="onEditorDragOver" @drop.capture.prevent.stop="onEditorDrop">
		<v-toolbar density="compact" color="surface" class="ps-4 pe-2">
			<v-icon class="mr-2">{{ languageIcon }}</v-icon>
			<v-toolbar-title class="text-body-large text-truncate">
				{{ Path.pretty(filename) }}
				<span v-if="dirty" class="text-warning">*</span>
			</v-toolbar-title>

			<v-spacer />

			<v-btn v-if="isGCode && useMonaco" variant="text" icon
				   :title="cursorInExpression ? $t('dialog.fileEdit.searchExpression') : $t('dialog.fileEdit.searchGcode')"
				   @click="searchGcode">
				<v-icon>mdi-tag-search</v-icon>
			</v-btn>

			<v-btn v-if="isGCode" variant="text" icon :title="$t('dialog.fileEdit.gcodeReference')"
				   :href="gcodeReferenceUrl" target="_blank" rel="noopener noreferrer">
				<v-icon>mdi-help-circle-outline</v-icon>
			</v-btn>

			<v-btn v-if="isGCode" variant="text" icon :disabled="saving || loading"
				   :title="$t('dialog.fileEdit.indentComments')" @click="indentComments">
				<v-icon>mdi-format-indent-increase</v-icon>
			</v-btn>

			<v-btn v-if="canRun" variant="text" icon :disabled="saving || loading || uiStore.uiFrozen"
				   :loading="running" :title="$t('dialog.fileEdit.run')" @click="run">
				<v-icon>mdi-play</v-icon>
			</v-btn>

			<v-btn variant="text" icon :disabled="!dirty || saving || loading || !canRevert"
				   :title="canRevert ? $t('dialog.fileEdit.revert') : $t('dialog.fileEdit.revertTooLarge')"
				   @click="revert">
				<v-icon>mdi-restore</v-icon>
			</v-btn>

			<v-btn variant="text" icon :disabled="!dirty || saving || loading" :loading="saving"
				   :title="$t('dialog.fileEdit.save')" @click="save">
				<v-icon>mdi-content-save</v-icon>
			</v-btn>
		</v-toolbar>

		<v-progress-linear v-if="loading || saving" :indeterminate="transferProgress === null"
						   :model-value="transferProgress ?? 0" height="4" color="primary" />

		<div v-if="loading" class="d-flex justify-center align-center editor-pane" />
		<v-alert v-else-if="loadError" type="error" variant="tonal" tile>{{ loadError }}</v-alert>
		<!-- Monaco's container is kept in the DOM (v-show) so bootstrap() can attach to the ref
			 while loading is still true; the textarea branch is v-if since it just binds to text -->
		<div v-show="useMonaco && !loading && !loadError" ref="container" class="editor-pane" />
		<textarea v-if="!useMonaco && !loading && !loadError" ref="textarea" v-model="textContent"
				  class="editor-pane editor-textarea"
				  :style="{ fontSize: settingsStore.editor.fontSize + 'px' }"
				  spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" />
	</div>

	<v-dialog v-model="dropDialog.shown" width="500">
		<v-card>
			<v-card-title>
				<v-icon class="mr-1">mdi-file-import</v-icon>
				{{ $t("dialog.editorDrop.title") }}
			</v-card-title>
			<v-card-text>{{ $t("dialog.editorDrop.prompt", [dropDialog.filename]) }}</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn variant="text" @click="dropDialog.shown = false">
					{{ $t("generic.cancel") }}
				</v-btn>
				<v-btn variant="text" @click="applyDroppedFile('insert')">
					{{ $t("dialog.editorDrop.insert") }}
				</v-btn>
				<v-btn color="primary" variant="text" autofocus @click="applyDroppedFile('overwrite')">
					{{ $t("dialog.editorDrop.overwrite") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { DisconnectedError } from "@duet3d/connectors";
import { MachineMode } from "@duet3d/objectmodel";
import type * as Monaco from "monaco-editor-core";

import i18n from "@/i18n";
import { scrollPageToBottom } from "@/router";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import { useSettingsStore } from "@/stores/settings";
import { indent } from "@/utils/display";
import { getErrorMessage } from "@/utils/errors";
import { ensureGcodeFeatures, ensureMonaco } from "@/utils/monaco";
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
	saved: [filename: string];
	dirty: [value: boolean];
}>();

const machineStore = useMachineStore();
const uiStore = useUiStore();
const settingsStore = useSettingsStore();

const container = ref<HTMLDivElement | null>(null);
const textarea = ref<HTMLTextAreaElement | null>(null);
const loading = ref(true);
const saving = ref(false);
const loadError = ref<string | null>(null);
const dirty = ref(false);
watch(dirty, (value) => emit("dirty", value));

let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
let originalValue: string | null = "";
let detachGcodeFeatures: Monaco.IDisposable | null = null;

// Model version id captured right after load/save/revert. Monaco keeps this identical whenever
// the buffer's content matches that snapshot again - including after undoing every edit - so
// comparing against it detects a clean buffer without diffing the (possibly huge) text itself
let savedVersionId: number | null = null;

// Touch-friendly textarea fallback. Snapshotted at boot so changing the setting mid-session
// doesn't swap editors out from under an open file; the user has to reopen it
const useMonaco = ref(true);
const textContent = ref("");
let suppressDirty = false;
watch(textContent, (value) => {
	if (suppressDirty) {
		return;
	}
	// Monaco's version-id trick isn't available here; fall back to a direct comparison. That's
	// only cheap while canRevert holds a baseline in memory - past the big-file threshold there's
	// nothing to diff against, so dirty just latches true on the first edit
	dirty.value = canRevert.value ? (value !== originalValue) : true;
});

// Files larger than this are loaded into the editor but the original content is dropped from
// memory once the editor takes over, so we don't keep two copies of a multi-megabyte buffer on
// devices with limited RAM (the SBC's Pi3 / Duet3 boards). Revert is disabled in that case
// since we can't restore without the saved original
const BIG_FILE_THRESHOLD = 32 * 1024 * 1024;
const canRevert = ref(true);

// 0-100 progress for the active download/upload, or null for "no total known yet" (the bar
// renders indeterminate in that case). Reset to null between transfers so a stale 100% from a
// previous save doesn't briefly flash on the next load
const transferProgress = ref<number | null>(null);

// Whether the cursor sits inside an expression - `{...}` blocks in g-code accept the object-model
// expression syntax, which has its own dedicated search panel. The toolbar's find button switches
// its label between "Find Code" and "Find Expression" based on this so the user knows which
// search widget will open
const cursorInExpression = ref(false);

// G/M/T-code the cursor currently sits on, used to deep-link the docs button into the matching
// per-code reference page. Null when the cursor isn't on a code (or outside g-code files)
const cursorCode = ref<string | null>(null);

const language = computed(() => detectLanguage(props.filename, machineStore.model.directories,
	machineStore.model.state.machineMode));

const isGCode = computed(() => language.value === "gcode-fdm" || language.value === "gcode-cnc");

const gcodeReferenceUrl = computed(() => {
	const base = "https://docs.duet3d.com/en/User_manual/Reference/Gcodes";
	return cursorCode.value ? `${base}/${cursorCode.value}` : base;
});

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

// Focus the editor so typing and Ctrl+S work right away. No-op while the editor's tab is hidden
// (display:none swallows focus calls), which also keeps a background tab from stealing the caret
function focusEditor() {
	if (useMonaco.value) {
		editor?.focus();
	} else {
		textarea.value?.focus();
	}
}

// Once the file finishes loading the editor swaps in at full height; scroll the page down so it
// sits flush at the viewport's bottom. Tied to the load completing rather than to navigation
// because an editor tab can be opened or switched to without a route change
watch(loading, (now) => {
	if (!now) {
		scrollPageToBottom();
		// The watcher runs pre-render: the editor pane is still display:none and the textarea ref
		// unset until the patch lands, so focusing must wait a tick
		nextTick(focusEditor);
	}
});

// Re-run load when a connection is re-established after a failed load. The download is the only
// thing that can fail with the "disconnected" guard; once the machine is back, retry transparently
// so the user doesn't have to close and reopen the tab. Guarded on loadError so we don't stomp on
// an editor that already loaded successfully
watch(() => machineStore.isConnected, (connected) => {
	if (connected && loadError.value !== null) {
		loadError.value = null;
		loading.value = true;
		bootstrap();
	}
});

async function bootstrap() {
	try {
		// Snapshot the editor choice for this session - swapping mid-edit would lose the buffer
		useMonaco.value = settingsStore.editor.useMonaco;

		const monaco = useMonaco.value ? await ensureMonaco(machineStore) : null;

		// Fetch the file content first; building the editor with the wrong content forces a
		// second model swap once it lands which is visually noisy. A route data loader may have
		// already pre-fetched the text, in which case we skip the download
		let content = props.initialContent ?? "";
		if (props.initialContent === undefined) {
			// Surface the disconnected case with a friendly message instead of the store's raw
			// "download is not available in default machine module" error - that's an internal
			// guard, not a user-facing string
			if (!machineStore.isConnected) {
				loadError.value = i18n.global.t("dialog.fileEdit.loadDisconnected");
				loading.value = false;
				return;
			}
			try {
				transferProgress.value = null;
				content = await machineStore.download(
					{ filename: props.filename, type: "text" },
					false, false, false, false,
					(loaded, total) => {
						transferProgress.value = total > 0 ? Math.min(100, (loaded / total) * 100) : null;
					},
				);
			} catch (e) {
				loadError.value = i18n.global.t("dialog.fileEdit.loadFailed", [Path.pretty(props.filename), getErrorMessage(e)]);
				loading.value = false;
				return;
			}
		}

		// For files under the threshold we keep a copy of the original to back the Revert action;
		// above it, drop the reference so the GC can reclaim - on the SBC's Pi3 holding both the
		// editor buffer and a 30 MiB string copy is enough to OOM on a heavy print job
		if (content.length <= BIG_FILE_THRESHOLD) {
			originalValue = content;
			canRevert.value = true;
		} else {
			originalValue = null;
			canRevert.value = false;
		}

		if (!useMonaco.value) {
			suppressDirty = true;
			textContent.value = content;
			await nextTick();
			suppressDirty = false;
			loading.value = false;
			return;
		}

		if (!container.value) {
			return;
		}
		editor = monaco!.editor.create(container.value, {
			value: content,
			language: language.value,
			theme: settingsStore.darkTheme ? "vs-dark" : "vs",
			automaticLayout: true,
			scrollBeyondLastLine: false,
			fixedOverflowWidgets: true,
			// Off by default so big job gcode files (tens of MB) still tokenize; Monaco otherwise
			// drops highlighting above ~20 MB. Creation-time only, so it's not in buildEditorOptions
			largeFileOptimizations: settingsStore.editor.largeFileOptimizations,
			...buildEditorOptions(settingsStore.editor),
		});
		editor.getModel()?.updateOptions(buildModelOptions(settingsStore.editor));
		savedVersionId = editor.getModel()?.getAlternativeVersionId() ?? null;

		editor.onDidChangeModelContent(() => {
			dirty.value = editor!.getModel()?.getAlternativeVersionId() !== savedVersionId;
		});

		// Ctrl/Cmd+S triggers the toolbar save and preventDefaults the browser's own "Save Page As"
		// dialog. addAction rather than addCommand: addCommand registers its keybinding globally
		// with no when-clause and never disposes it, so the newest editor's binding shadows every
		// other editor's - even after that editor is disposed, leaving Ctrl+S saving the wrong file
		// or dead once a second editor tab has existed. addAction scopes the keybinding to this
		// instance via its editorId context key
		editor.addAction({
			id: "dwc.saveFile",
			label: i18n.global.t("dialog.fileEdit.save"),
			keybindings: [monaco!.KeyMod.CtrlCmd | monaco!.KeyCode.KeyS],
			run: () => { save(); },
		});

		if (isGCode.value) {
			const { attachGcodeFeatures, isInsideExpression, findCodeAtCursor } = await ensureGcodeFeatures();
			detachGcodeFeatures = attachGcodeFeatures(monaco!, editor);

			// Sync cursor-derived flags on every caret move: cursorInExpression switches the Find
			// button's label, cursorCode deep-links the docs button into the matching G/M/T page
			const updateCursorContext = () => {
				const model = editor!.getModel();
				const position = editor!.getPosition();
				if (!model || !position) {
					cursorInExpression.value = false;
					cursorCode.value = null;
					return;
				}
				const lineContent = model.getLineContent(position.lineNumber);
				cursorInExpression.value = isInsideExpression(lineContent.substring(0, position.column - 1));
				const enclosing = findCodeAtCursor(lineContent, position.column - 1);
				cursorCode.value = enclosing ? enclosing.code : null;
			};
			updateCursorContext();
			editor.onDidChangeCursorPosition(updateCursorContext);
			editor.onDidChangeModelContent(updateCursorContext);
		}

		loading.value = false;
	} catch (e) {
		loadError.value = getErrorMessage(e);
		loading.value = false;
	}
}

onMounted(bootstrap);

onBeforeUnmount(() => {
	detachGcodeFeatures?.dispose();
	editor?.dispose();
	editor = null;
});

watch(() => settingsStore.darkTheme, (dark) => {
	if (editor) {
		import("monaco-editor-core").then((monaco) => {
			monaco.editor.setTheme(dark ? "vs-dark" : "vs");
		}).catch(() => {});
	}
});

// Re-apply editor preferences whenever the user tweaks them in Settings > Editor. tabSize lives
// on the text model rather than the editor itself, so propagate via a separate updateOptions call
watch(() => settingsStore.editor, (next) => {
	editor?.updateOptions(buildEditorOptions(next));
	editor?.getModel()?.updateOptions(buildModelOptions(next));
}, { deep: true });

async function save(): Promise<boolean> {
	if (saving.value) {
		return false;
	}
	if (useMonaco.value && !editor) {
		return false;
	}
	saving.value = true;
	transferProgress.value = null;
	try {
		if (settingsStore.editor.replaceTabsOnSave) {
			replaceTabs();
		}
		const content = useMonaco.value ? editor!.getValue() : textContent.value;
		await machineStore.upload(
			{ filename: props.filename, content: new Blob([content]) },
			false, false, true, false,
			(loaded, total) => {
				transferProgress.value = total > 0 ? Math.min(100, (loaded / total) * 100) : null;
			},
		);
		// Re-snapshot for the next revert pass only if we're still under the threshold. A user
		// who grew the file past 32 MiB loses the revert capability on next save
		if (content.length <= BIG_FILE_THRESHOLD) {
			originalValue = content;
			canRevert.value = true;
		} else {
			originalValue = null;
			canRevert.value = false;
		}
		if (useMonaco.value) {
			savedVersionId = editor?.getModel()?.getAlternativeVersionId() ?? null;
		}
		dirty.value = false;
		emit("saved", props.filename);
		return true;
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("dialog.fileEdit.saveFailed", [props.filename]));
		return false;
	} finally {
		saving.value = false;
	}
}

// M98 executes any macro-style file in place, pending changes being saved first. Sliced jobs under
// the gcodes directory are started with M32 from the Jobs page instead, so the button skips those
const canRun = computed(() => isGCode.value && !Path.startsWith(props.filename, machineStore.model.directories.gCodes));
const running = ref(false);

async function run() {
	if (running.value || (dirty.value && !(await save()))) {
		return;
	}
	running.value = true;
	try {
		await machineStore.sendCode(`M98 P"${Path.escapeFilename(props.filename)}"`);
	} catch (e) {
		if (!(e instanceof DisconnectedError)) {
			console.warn(e);
		}
	}
	running.value = false;
}

function revert() {
	// originalValue is null for files past the threshold; the button is disabled in that case
	// but guard here too in case it ever fires through some other path
	if (originalValue === null) {
		return;
	}
	if (useMonaco.value) {
		editor?.setValue(originalValue);
		savedVersionId = editor?.getModel()?.getAlternativeVersionId() ?? null;
	} else {
		suppressDirty = true;
		textContent.value = originalValue;
		nextTick(() => { suppressDirty = false; });
	}
	dirty.value = false;
}

// #region File drop
// Dropping a file onto the editor either overwrites the buffer or pastes the file in at the
// cursor. An empty file has nothing to insert, so it always overwrites without asking
const dropDialog = reactive({ shown: false, filename: "" });
let droppedContent = "";

function onEditorDragOver(event: DragEvent) {
	if (event.dataTransfer && Array.from(event.dataTransfer.types).includes("Files")) {
		event.dataTransfer.dropEffect = "copy";
	}
}

async function onEditorDrop(event: DragEvent) {
	if (loading.value || loadError.value || !event.dataTransfer) {
		return;
	}
	const file = event.dataTransfer.files[0];
	if (!file) {
		return;
	}
	try {
		droppedContent = await file.text();
	} catch (e) {
		uiStore.notifyError(e, i18n.global.t("dialog.editorDrop.title"));
		return;
	}
	if (file.size === 0) {
		applyDroppedFile("overwrite");
	} else {
		dropDialog.filename = file.name;
		dropDialog.shown = true;
	}
}

function applyDroppedFile(mode: "overwrite" | "insert") {
	dropDialog.shown = false;
	if (useMonaco.value) {
		if (!editor) {
			return;
		}
		if (mode === "overwrite") {
			editor.setValue(droppedContent);
		} else {
			const selection = editor.getSelection();
			if (selection) {
				editor.executeEdits("drop", [{ range: selection, text: droppedContent, forceMoveMarkers: true }]);
			}
		}
		editor.focus();
	} else if (mode === "overwrite") {
		textContent.value = droppedContent;
	} else {
		const element = textarea.value;
		const start = element ? element.selectionStart : textContent.value.length;
		const end = element ? element.selectionEnd : textContent.value.length;
		textContent.value = textContent.value.slice(0, start) + droppedContent + textContent.value.slice(end);
	}
	droppedContent = "";
}
// #endregion

// Delegates to the duet.searchGcode action registered by @duet3d/monacotokens. The action
// itself picks the right search widget based on whether the cursor is in an expression
function searchGcode() {
	editor?.getAction("duet.searchGcode")?.run();
}

// Aligns line comments onto a common column across the whole file. Goes through executeEdits
// (rather than setValue) so the change is undoable and doesn't reset the cursor/scroll position
function indentComments() {
	if (useMonaco.value) {
		if (!editor) {
			return;
		}
		const indentedFile = indent(editor.getValue());
		if (editor.getValue() !== indentedFile) {
			const model = editor.getModel();
			if (model) {
				editor.executeEdits(null, [{ range: model.getFullModelRange(), text: indentedFile }]);
				editor.pushUndoStop();
			}
		}
	} else {
		textContent.value = indent(textContent.value);
	}
}

// Replaces every tab character in the buffer with spaces, invoked from save() when the
// corresponding setting is enabled. Rewrites the buffer (not just the uploaded content) so the
// editor keeps matching the file on disk; goes through executeEdits so the change is undoable
// and doesn't reset the cursor/scroll position.
// Files past BIG_FILE_THRESHOLD are skipped, matching the other whole-buffer operations: that
// size means sliced job output rather than a hand-edited file, and rewriting it is expensive
function replaceTabs() {
	// Guard against a cleared/invalid number field in the settings; fall back to the default of 4
	const size = settingsStore.editor.replaceTabsSize;
	const spaces = " ".repeat((Number.isFinite(size) && size >= 1) ? Math.floor(size) : 4);

	if (useMonaco.value) {
		if (!editor) {
			return;
		}
		const value = editor.getValue();
		if (value.length <= BIG_FILE_THRESHOLD && value.includes("\t")) {
			const model = editor.getModel();
			if (model) {
				editor.executeEdits(null, [{ range: model.getFullModelRange(), text: value.replaceAll("\t", spaces) }]);
				editor.pushUndoStop();
			}
		}
	} else if (textContent.value.length <= BIG_FILE_THRESHOLD && textContent.value.includes("\t")) {
		// No need for the suppressDirty dance here: save() resets dirty once the upload succeeds,
		// and on failure the buffer genuinely differs from the file so staying dirty is correct
		textContent.value = textContent.value.replaceAll("\t", spaces);
	}
}

// Lets the Explorer trigger a save when closing a tab with unsaved changes
defineExpose({ save, focus: focusEditor });

// #region Helpers

// Translate the persisted settingsStore.editor shape into Monaco's IEditorOptions. Keeping this
// pure (no editor ref needed) lets it serve both the initial create() call and the live
// updateOptions() path triggered when the user changes a setting in Settings > Editor
// tabSize is excluded here because it belongs on the text model, not the editor - see buildModelOptions
function buildEditorOptions(prefs: ReturnType<typeof useSettingsStore>["editor"]): Monaco.editor.IEditorOptions {
	return {
		fontSize: prefs.fontSize,
		wordWrap: prefs.wordWrap,
		minimap: { enabled: prefs.minimap },
		lineNumbers: prefs.lineNumbers ? "on" : "off",
		renderWhitespace: prefs.renderWhitespace ? "all" : "selection",
		// Monaco's quickSuggestions can be a boolean or an object scoping by context (comments,
		// strings, other). Mirror the framework default of suppressing in comments/strings when
		// enabled so macro-author comments don't spam suggestions
		quickSuggestions: prefs.quickSuggestions
			? { other: "on", comments: "off", strings: "off" }
			: false,
		suggestOnTriggerCharacters: prefs.suggestOnTriggerCharacters,
		parameterHints: { enabled: prefs.parameterHints },
		// monaco-editor-core defaults hover.above to true; prefer below the line (room permitting)
		hover: { enabled: prefs.hover ? "on" : "off", above: false },
		inlineSuggest: { enabled: prefs.inlineSuggest },
		bracketPairColorization: { enabled: prefs.bracketPairColorization },
		formatOnPaste: prefs.formatOnPaste,
		formatOnType: prefs.formatOnType,
		colorDecorators: false,
	};
}

// tabSize is a per-model setting, not an editor setting. It also drives insertSpaces (always true
// for DWC since the gcode/json/config files we edit never use literal tab characters)
function buildModelOptions(prefs: ReturnType<typeof useSettingsStore>["editor"]): Monaco.editor.ITextModelUpdateOptions {
	return {
		tabSize: prefs.tabSize,
		insertSpaces: true,
	};
}

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

// #endregion
</script>
