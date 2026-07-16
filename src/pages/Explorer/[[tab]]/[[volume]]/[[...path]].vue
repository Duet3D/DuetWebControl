<route lang="json">
{
	"meta": {
		"pageFill": true,
		"keepAlive": "Explorer",
		"menu": {
			"category": "files",
			"icon": "mdi-folder-multiple",
			"caption": "menu.files.explorer",
			"order": 20,
			"path": "/Explorer",
			"badgeKey": "modifiedEditors"
		}
	}
}
</route>

<style scoped>
.explorer-tab-label {
	max-width: 8rem;
}
@media (min-width: 600px) {
	.explorer-tab-label { max-width: 12rem; }
}
@media (min-width: 840px) {
	.explorer-tab-label { max-width: 16rem; }
}

/* Viewport fill comes from the global `.dwc-page-fill` class on the v-card. When the active
   tab is in a collapsed state (Monaco editor failed to load OR the FileList is empty +
   disconnected) advertise that downstream so the card can fall back to content height */
.explorer-card:has(.v-window-item--active .monaco-editor-host--collapsed),
.explorer-card:has(.v-window-item--active .file-list-card--empty) {
	height: auto;
}

.explorer-window {
	min-height: 0;
}

.explorer-tab--drop-target {
	background-color: rgba(var(--v-theme-primary), 0.18) !important;
}
.explorer-window :deep(.v-window__container),
.explorer-window :deep(.v-window-item) {
	height: 100%;
}
</style>

<template>
	<div class="route-root">
		<v-card class="explorer-card dwc-page-fill d-flex flex-column">
			<v-toolbar v-if="tabs.length > 1" density="compact" color="surface" class="flex-shrink-0">
				<v-tabs v-model="activeTab" align-tabs="start" show-arrows density="compact" class="flex-grow-1">
					<v-tab v-for="tab in tabs" :key="tab.id" :value="tab.id" class="text-none"
						   :color="isTabDirty(tab) ? 'warning' : undefined" draggable="true"
						   @mousedown.middle.prevent="onTabMiddleClick(tab)"
						   @dragstart="onTabDragStart($event, tab)"
						   @dragend="onTabDragEnd"
						   @dragover="onTabDragOver($event, tab)"
						   @dragleave="onTabDragLeave"
						   @drop="onTabDrop($event, tab)">
						<v-icon size="small" class="mr-2">{{ tabIcon(tab) }}</v-icon>
						<span class="explorer-tab-label text-truncate">{{ tabLabel(tab) }}{{ isTabDirty(tab) ? " *" : "" }}</span>
						<v-btn v-if="tabs.length > 1" variant="text" size="small" density="comfortable"
							   icon class="ml-2" :title="$t('list.explorer.closeTab')"
							   :disabled="isLastBrowserTab(tab)"
							   @click.stop="requestCloseTab(tab.id)">
							<v-icon size="20">mdi-close</v-icon>
						</v-btn>
					</v-tab>
				</v-tabs>

				<v-btn variant="text" icon :title="$t('list.explorer.newTab')"
					   @click="addTab(defaultVolume)">
					<v-icon>mdi-plus</v-icon>
				</v-btn>
			</v-toolbar>

			<v-window v-model="activeTab" :touch="false" class="explorer-window flex-grow-1">
				<v-window-item v-for="tab in tabs" :key="tab.id" :value="tab.id" eager
							   :transition="windowItemTransition" :reverse-transition="windowItemTransition">
					<MonacoEditor v-if="tab.kind === 'editor' && tab.filename"
								  :ref="(el) => setEditorRef(tab.id, el)" :filename="tab.filename"
								  :initial-content="tab.initialContent" @dirty="tab.dirty = $event"
								  @saved="onEditorSaved(tab)" />
					<FileList v-else v-model:directory="tab.directory"
							  :options="optionsForTab(tab)"
							  :root-directory="rootForTab(tab)" :root-label="rootLabelFor(tab)"
							  no-items-text="list.baseFileList.noFiles" no-view-mode
							  :firmware-aware="isFirmwareContext(tab.directory)"
							  @file-click="onFileClick" @file-edit="onFileEdit"
							  @file-run-macro="onFileRunMacro" @file-simulate="onFileSimulate"
							  @refresh="onExplorerRefresh">
						<template #progress>
							<v-progress-linear v-if="thumbnailProgress !== -1" height="2"
											   :indeterminate="thumbnailTotal === 0"
											   :model-value="thumbnailTotal === 0 ? 0 : (thumbnailProgress / thumbnailTotal) * 100" />
						</template>

						<template #nameIcon="slotProps">
							<JobThumbnailCell :item="slotProps.item"
											  :tile="(slotProps as { tile?: boolean }).tile === true" />
						</template>

						<template v-if="tabs.length === 1" #actions>
							<v-btn variant="text" icon :title="$t('list.explorer.newTab')"
								   @click="addTab(defaultVolume)">
								<v-icon>mdi-plus</v-icon>
							</v-btn>
						</template>
						<template v-if="availableVolumes.length > 1" #upload-prepend>
							<v-menu>
								<template #activator="{ props: activatorProps }">
									<v-btn v-bind="activatorProps" variant="text" icon
										   :title="$t('list.explorer.volume')">
										<v-icon>mdi-sd</v-icon>
									</v-btn>
								</template>
								<v-list :density="controlDensity">
									<v-list-item v-for="vol in availableVolumes" :key="vol"
												 :active="Path.getVolume(tab.directory ?? '') === vol"
												 :title="volumeCaption(vol)"
												 @click="tab.directory = Path.volumeRoot(vol)" />
								</v-list>
							</v-menu>
						</template>
					</FileList>
				</v-window-item>
			</v-window>
		</v-card>

		<ConfirmDialog v-model:shown="runMacroDialog.shown"
					   :title="$t('dialog.runMacro.title', [runMacroDialog.filename])"
					   :prompt="$t('dialog.runMacro.prompt', [runMacroDialog.filename])" icon="mdi-play"
					   @confirmed="confirmRunMacro">
			<template #extra-actions>
				<v-btn variant="text" type="button" @click="editMacroFromDialog">
					<v-icon class="mr-1">mdi-file-document-edit</v-icon>
					{{ $t("list.fileList.edit") }}
				</v-btn>
			</template>
		</ConfirmDialog>

		<ConfirmDialog v-model:shown="startJobDialog.shown"
					   :title="$t('dialog.startJob.title', [startJobDialog.filename])"
					   :prompt="$t('dialog.startJob.prompt', [startJobDialog.filename])" icon="mdi-play"
					   @confirmed="confirmStartJob">
			<template #extra-actions>
				<v-btn variant="text" type="button" @click="editJobFromDialog">
					<v-icon class="mr-1">mdi-file-document-edit</v-icon>
					{{ $t("list.fileList.edit") }}
				</v-btn>
			</template>
		</ConfirmDialog>

		<v-dialog v-model="discardDialog.shown" width="480" persistent no-click-animation>
			<v-form @submit.prevent="saveAndClose">
				<v-card>
					<v-card-title>
						<v-icon class="mr-1">mdi-content-save-alert</v-icon>
						{{ $t("dialog.fileEdit.unsaved.title") }}
					</v-card-title>
					<v-card-text>{{ $t("dialog.fileEdit.unsaved.prompt", [discardDialog.filename]) }}</v-card-text>
					<v-card-actions>
						<v-spacer />
						<v-btn variant="text" type="button" @click="cancelClose">
							{{ $t("generic.cancel") }}
						</v-btn>
						<v-btn variant="text" type="button" @click="discardAndClose">
							{{ $t("dialog.fileEdit.unsaved.dontSave") }}
						</v-btn>
						<v-btn variant="text" type="submit" autofocus>
							{{ $t("dialog.fileEdit.unsaved.save") }}
						</v-btn>
					</v-card-actions>
				</v-card>
			</v-form>
		</v-dialog>

		<FirmwareUpdateDialog v-model:shown="sharedFirmwareController.firmwareDialog.shown"
							  :plan="sharedFirmwareController.firmwareDialog.plan"
							  @confirmed="sharedFirmwareController.onFirmwareUpdateConfirmed"
							  @cancelled="sharedFirmwareController.onFirmwareUpdateCancelled" />

		<ConfigUpdatedDialog v-model:shown="sharedFirmwareController.configUpdatedDialog.shown" />
	</div>
</template>

<script lang="ts">
// Pre-fetch the active tab's content during navigation: a directory listing for browser tabs,
// the file contents for editor tabs. Result is consumed in <script setup> to seed either the
// initial FileList or the MonacoEditor. `lazy: true` keeps the route transition snappy on slow
// boards - the editor and file list render their own loading state in the meantime
import type { FileListItem } from "@duet3d/connectors";
import { defineBasicLoader } from "vue-router/experimental";

import { useMachineStore } from "@/stores/machine";
import Path from "@/utils/path";

interface ExplorerInitialPayload {
	path: string;
	kind: "directory" | "editor" | "none";
	files?: Array<FileListItem>;
	content?: string;
}

// Shape matches the typed `/Explorer/[[tab]]/[[volume]]/[[...path]]` route. The data loader gets
// vue-router's generic params and casts in (one boundary); useRoute(...) inside the component is
// already this shape natively
export interface ExplorerRouteParams {
	tab?: string;
	volume?: string;
	// vue-router's `:path*` catch-all returns an array of segments. `[[...path]]` produces
	// `string[]` when populated; treat both forms downstream via normalisePathParam()
	path?: string | string[];
}

function normalisePathParam(value: string | string[] | undefined): string {
	if (Array.isArray(value)) {
		return value.join("/");
	}
	return value ?? "";
}

// The Explorer URL packs up to three things into its segments: an optional `t<n>` tab ordinal
// (1-based position in the tab strip, dropped for the first tab), an optional numeric volume
// index (dropped for volume 0), then the directory/file path. unplugin-vue-router hands these
// back as three positional params regardless of which were actually present, so flatten them
// into one ordered segment list and parse it front-to-back
function resolveExplorerRoute(params: ExplorerRouteParams): {
	tab: number | undefined; volume: number; path: string; editor: boolean;
} {
	const segments: Array<string> = [];
	if (params.tab !== undefined) {
		segments.push(params.tab);
	}
	if (params.volume !== undefined) {
		segments.push(params.volume);
	}
	if (Array.isArray(params.path)) {
		segments.push(...params.path);
	} else if (params.path) {
		segments.push(...params.path.split("/"));
	}
	const cleaned = segments.filter((segment) => segment !== "");

	let tab: number | undefined;
	if (cleaned.length > 0 && /^t\d+$/.test(cleaned[0])) {
		tab = Number.parseInt(cleaned[0].substring(1), 10);
		cleaned.shift();
	}
	// A reserved `edit` segment before the volume marks the URL as a file to open in the editor;
	// vue-router can't carry a trailing-slash signal (strict mode 404s it, non-strict strips it),
	// so the path itself is unambiguous about file vs directory. Shadows a root folder named "edit"
	// the same way a `t<n>` ordinal shadows a folder named "t2"
	let editor = false;
	if (cleaned.length > 0 && cleaned[0] === "edit") {
		editor = true;
		cleaned.shift();
	}
	let volume = 0;
	if (cleaned.length > 0 && /^\d+$/.test(cleaned[0])) {
		volume = Number.parseInt(cleaned[0], 10);
		cleaned.shift();
	}
	return { tab, volume, path: cleaned.join("/"), editor };
}

function sdPathFromParams(params: ExplorerRouteParams): string {
	const { volume, path } = resolveExplorerRoute(params);
	return path ? `${volume}:/${path}` : `${volume}:/`;
}

function isBareExplorerRoute(params: ExplorerRouteParams): boolean {
	return !params.tab && !params.volume && !params.path;
}

export const useExplorerInitialData = defineBasicLoader(async (to): Promise<ExplorerInitialPayload> => {
	const params = to.params as ExplorerRouteParams;
	if (isBareExplorerRoute(params)) {
		return { path: "0:/", kind: "directory" };
	}
	const path = sdPathFromParams(params);
	if (!path) {
		return { path: "", kind: "none" };
	}
	// The URL itself declares file vs directory (the `edit` prefix), so no FS probe / extension
	// guessing is needed - we only fetch the matching payload to seed the tab
	const { editor } = resolveExplorerRoute(params);
	const machineStore = useMachineStore();
	if (editor) {
		if (machineStore.isConnected) {
			try {
				const content = await machineStore.download({ filename: path, type: "text" }, false, false, false);
				return { path, kind: "editor", content };
			} catch (e) {
				// The editor tab still opens and surfaces its own load error/empty state
				console.warn("Explorer editor preload failed", e);
			}
		}
		return { path, kind: "editor" };
	}
	if (!machineStore.isConnected) {
		// No FS to query; the page renders an empty browser tab until a real connection arrives
		return { path, kind: "directory" };
	}
	try {
		const files = await machineStore.getFileList(path);
		return { path, kind: "directory", files };
	} catch (e) {
		console.warn("Explorer directory listing failed", e);
		return { path, kind: "directory" };
	}
}, { lazy: true });
</script>

<script setup lang="ts">
import type { FileBrowserItem } from "@/composables/useFileBrowser";
import { useGcodeThumbnails } from "@/composables/useGcodeThumbnails";
import ConfigUpdatedDialog from "@/components/dialogs/ConfigUpdatedDialog.vue";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog.vue";
import FileList from "@/components/lists/FileList.vue";
import { useLargeButtons } from "@/composables/useLargeButtons";
import FirmwareUpdateDialog from "@/components/dialogs/FirmwareUpdateDialog.vue";
import JobThumbnailCell from "@/components/lists/JobThumbnailCell.vue";
import MonacoEditor from "@/components/editor/MonacoEditor.vue";
import { firmwareInstallControllerKey, useFirmwareInstallController } from "@/composables/useFirmwareInstallController";
import i18n from "@/i18n";
import { scrollPageToBottom } from "@/router";
import { useSettingsStore } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import { isPrinting } from "@/utils/enums";

defineOptions({ name: "Explorer" });

interface ExplorerTab {
	id: number;
	kind: "browser" | "editor";
	/** Filename for editor tabs */
	filename?: string;
	/** Current directory for browser tabs - two-way bound through FileList's v-model:directory */
	directory?: string;
	/** One-shot pre-fetched listing from the route data loader */
	initialFiles?: Array<FileBrowserItem>;
	/** One-shot pre-fetched editor content from the route data loader */
	initialContent?: string;
	/** Window scroll snapshot for browser tabs, restored on re-entry; editor tabs re-scroll to the bottom instead */
	scrollY?: number;
	/** Tracks unsaved Monaco changes (editor tabs only); drives the close confirm and unload guard */
	dirty?: boolean;
	/** Set once a file that warrants a firmware reset (config.g, board.txt) was saved in this tab,
	 * under the "onTabClose" reset-prompt preference, so the prompt can fire when the tab is closed */
	resetPromptDue?: boolean;
}

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();
const { controlDensity } = useLargeButtons();
const route = useRoute("/Explorer/[[tab]]/[[volume]]/[[...path]]");
const router = useRouter();

const { data: initialPayload } = useExplorerInitialData();

// Single shared firmware-install controller for all child FileLists (one per Explorer tab)
// Without this, each FileList would mount its own FirmwareUpdateDialog + ConfigUpdatedDialog
// pair - cheap when hidden but redundant scaffolding. provide() hooks the children up via
// inject() in FileList.vue
const sharedFirmwareController = useFirmwareInstallController();
provide(firmwareInstallControllerKey, sharedFirmwareController);

// Indices of currently-mounted volumes. Falls back to [0] when the model has no volumes yet
// so the picker still renders a sensible label while the connection is settling
const availableVolumes = computed<Array<number>>(() => {
	const volumes = machineStore.model.volumes ?? [];
	if (volumes.length === 0) {
		return [0];
	}
	return volumes
		.map((vol, idx) => ({ vol, idx }))
		.filter(({ vol }) => vol?.mounted)
		.map(({ idx }) => idx);
});

const defaultVolume = computed<number>(() => availableVolumes.value[0] ?? 0);

// Resolve a volume index to its OM-reported display name; fall back to the raw `N:/` path
// when the board does not give one (typical for the implicit volume 0)
function volumeCaption(index: number): string {
	const vol = machineStore.model.volumes?.[index];
	return vol?.name || Path.volumeRoot(index);
}

let nextTabId = 1;

// First-mount URL -> tab seed. Bare `/Explorer` opens a single browser tab at `0:/`; otherwise the
// URL's `edit` prefix tells us file vs directory synchronously (no waiting on the lazy loader), and
// the loader fills in content/listing when it resolves. A `t<n>` ordinal in the URL only addresses
// tabs within a live session - it can't reconstruct the sibling tabs that were open when the URL
// was produced, so a deep link always seeds a single tab (or a browser + editor pair for file URLs)
// and the ordinal is reconciled away on the first URL push
function buildInitialTabs(): Array<ExplorerTab> {
	const params = route.params;
	if (isBareExplorerRoute(params)) {
		return [{ id: nextTabId++, kind: "browser", directory: "0:/" }];
	}
	const initialPath = sdPathFromParams(params);
	const payload = initialPayload.value;
	if (resolveExplorerRoute(params).editor) {
		// Editor-only routes still get a sibling browser tab so the user has something to switch
		// to (and so the `+` button in the multi-tab strip remains reachable). Rooted at the
		// file's containing volume so it makes sense alongside the open file
		const fallbackVolume = /^(\d+):/.exec(initialPath)?.[0] ?? "0:";
		return [
			{ id: nextTabId++, kind: "browser", directory: `${fallbackVolume}/` },
			{
				id: nextTabId++,
				kind: "editor",
				filename: initialPath,
				initialContent: payload?.kind === "editor" && payload.path === initialPath ? payload.content : undefined,
			},
		];
	}
	return [{
		id: nextTabId++,
		kind: "browser",
		directory: initialPath,
		initialFiles: payload?.kind === "directory" && payload.path === initialPath
			? (payload.files as Array<FileBrowserItem> | undefined) ?? undefined
			: undefined,
	}];
}

const initialTabs = buildInitialTabs();
const tabs = ref<Array<ExplorerTab>>(initialTabs);
// When buildInitialTabs returned both a browser and an editor tab (deep-link to a file), focus
// the editor - that's what the user navigated to. Otherwise focus the single tab we built
const activeTab = ref<number>(initialTabs[initialTabs.length - 1].id);

// Tab-local window scroll memory. v-window-item keeps each tab's DOM mounted (eager) so the
// content is still there when the user switches away - but the window scroll position is a single
// document-level value, not per-tab. On a tab switch, stash the outgoing tab's scroll; for the
// incoming tab an editor re-scrolls to the viewport bottom (the position scrollPageToBottom gives
// it on load) while a browser tab restores wherever the user left it. nextTick lets v-window finish
// its display swap so the page height reflects the incoming tab first
watch(activeTab, (toId, fromId) => {
	const outgoing = tabs.value.find((t) => t.id === fromId);
	if (outgoing) {
		outgoing.scrollY = window.scrollY;
	}
	const incoming = tabs.value.find((t) => t.id === toId);
	if (incoming?.kind === "editor") {
		scrollPageToBottom();
	} else {
		nextTick(() => window.scrollTo({ top: incoming?.scrollY ?? 0, behavior: "instant" }));
	}
});

// The Explorer is kept alive, so leaving for another page (e.g. the Dashboard) and coming back
// neither remounts the editor nor fires the activeTab watch - re-scroll an open editor tab to the
// bottom so it returns to its load-time position. Browser tabs are left to the router's scrollBehavior
onActivated(() => {
	if (tabs.value.find((t) => t.id === activeTab.value)?.kind === "editor") {
		scrollPageToBottom();
	}
});

// Single shared thumbnail fetcher across all browser tabs. Switching tabs mid-fetch cancels
// the previous one (acceptable: the cache holds whatever did complete and the next visit hits
// it). The composable only sweeps the gcodes tree and external volumes, so /sys, /macros and
// other system areas never pay the per-row fetch cost
const explorerThumbnails = useGcodeThumbnails();
const { fileinfoProgress: thumbnailProgress, fileinfoTotal: thumbnailTotal } = explorerThumbnails;
onDeactivated(explorerThumbnails.cancelInFlight);
onBeforeUnmount(explorerThumbnails.cancelInFlight);

function onExplorerRefresh(refreshedDirectory: string) {
	explorerThumbnails.clearCacheForDirectory(refreshedDirectory);
}

function optionsForTab(tab: ExplorerTab) {
	return {
		initialDirectory: tab.directory ?? "0:/",
		initialFiles: tab.initialFiles,
		decorate: (items: Array<FileBrowserItem>, dir: string) => explorerThumbnails.decorate(items, dir),
	};
}

// Tabs at non-default volumes need to root the breadcrumbs at *their* volume's root rather
// than 0:/ so the "up" affordance stops at the right place
function rootForTab(tab: ExplorerTab): string {
	return Path.volumeRoot(Path.getVolume(tab.directory ?? ""));
}

function rootLabelFor(tab: ExplorerTab): string {
	return volumeCaption(Path.getVolume(tab.directory ?? ""));
}

// Route uploads through the firmware-install pipeline when the user is browsing a directory
// where firmware payloads naturally land: the volume root (drag-and-drop of a board image),
// the firmware directory itself, or the system directory. Anywhere else (e.g. /gcodes,
// /macros) uses the plain upload path so app-level files don't get reclassified as binaries
function isFirmwareContext(dir: string | undefined): boolean {
	if (!dir) {
		return false;
	}
	if (Path.equals(dir, "0:/")) {
		return true;
	}
	const dirs = machineStore.model.directories;
	return Path.startsWith(dir, dirs.system) || Path.startsWith(dir, dirs.firmware);
}

// Lazy-loader fold-in: when the loader resolves after mount, fold its result into the active
// tab if that tab still points at the loader's path (i.e. no in-app nav happened in the gap)
watch(initialPayload, (payload) => {
	if (!payload || payload.kind === "none") {
		return;
	}
	const tab = tabs.value.find((t) => t.id === activeTab.value);
	if (!tab) {
		return;
	}
	if (payload.kind === "editor" && tab.kind === "editor" && tab.filename === payload.path
			&& tab.initialContent === undefined) {
		tab.initialContent = payload.content;
	} else if (payload.kind === "directory" && tab.kind === "browser" && tab.directory === payload.path
			&& tab.initialFiles === undefined) {
		tab.initialFiles = (payload.files as Array<FileBrowserItem> | undefined) ?? undefined;
	}
});

const runMacroDialog = reactive({
	shown: false,
	filename: "",
	fullPath: "",
});

const startJobDialog = reactive({
	shown: false,
	filename: "",
	fullPath: "",
});

function tabIcon(tab: ExplorerTab): string {
	return tab.kind === "editor" ? "mdi-file-document-edit" : "mdi-folder";
}

function isTabDirty(tab: ExplorerTab): boolean {
	return tab.kind === "editor" && tab.dirty === true;
}

// The `+` new-tab button only renders inside a browser tab (its FileList #actions slot when a
// single tab is open, or the multi-tab toolbar otherwise). Closing the final browser tab while an
// editor tab remains would therefore strand the user with no way to open another tab, so keep the
// last browser tab uncloseable
const browserTabCount = computed<number>(() => tabs.value.filter((t) => t.kind === "browser").length);

function isLastBrowserTab(tab: ExplorerTab): boolean {
	return tab.kind === "browser" && browserTabCount.value === 1;
}

// Browser tab label = leaf directory name (or volume caption at the root) so users can tell
// two tabs apart at a glance when both are open on the same volume. Truncation + explorer-tab-label
// CSS keeps long names from squeezing siblings out. Editor tab label = the filename
function tabLabel(tab: ExplorerTab): string {
	if (tab.kind === "editor" && tab.filename) {
		return Path.extractFileName(tab.filename);
	}
	const dir = tab.directory ?? "0:/";
	const volume = Path.getVolume(dir);
	// Strip the leading "N:/" so what's left is the path within the volume. Empty => root,
	// fall back to the volume caption ("0:/", "1:/", ...) so the tab isn't blank
	const inVolume = dir.replace(/^\d+:\//, "").replace(/\/+$/, "");
	if (inVolume.length === 0) {
		return volumeCaption(volume);
	}
	// Show only the final segment - "sys/macros/setup" would otherwise overflow the tab strip
	const leaf = inVolume.substring(inVolume.lastIndexOf("/") + 1);
	return leaf;
}

function addTab(volume: number) {
	const tab: ExplorerTab = {
		id: nextTabId++,
		kind: "browser",
		directory: `${volume}:/`,
	};
	tabs.value.push(tab);
	activeTab.value = tab.id;
}

// Each file is opened at most once - a second click on the same filename brings the existing
// editor tab to the front instead of spawning a duplicate. This is what lets the URL drop the
// per-tab `t<n>` identifier: each open editor maps 1:1 to its path
function openEditorTab(filename: string) {
	const existing = tabs.value.find((t) => t.kind === "editor" && t.filename === filename);
	if (existing) {
		activeTab.value = existing.id;
		return;
	}
	const tab: ExplorerTab = {
		id: nextTabId++,
		kind: "editor",
		filename,
	};
	tabs.value.push(tab);
	activeTab.value = tab.id;
}

// Whether saving this file should offer a firmware reset / config re-run once the editor closes.
// config.g always qualifies (it lives at directories.system + config.g; the literal 0:/sys/config.g
// is also accepted since the system directory is configurable but practically always resolves there).
// board.txt only qualifies on a non-Duet mainboard - LPC/STM32 ports read it, genuine Duet boards
// never do, so it would be a meaningless prompt there
function warrantsResetPrompt(filename: string): boolean {
	if (Path.equals(filename, Path.combine(machineStore.model.directories.system, Path.configFile))
			|| Path.equals(filename, "0:/sys/config.g")) {
		return true;
	}
	if (Path.equals(filename, Path.boardFile)) {
		const mainboard = machineStore.model.boards[0] ?? null;
		return mainboard !== null && !mainboard.name.includes("Duet");
	}
	return false;
}

// Offer the firmware reset / config re-run, unless a print is running - the config is in use and a
// reset would abort the job
function showResetPrompt() {
	if (!isPrinting(machineStore.model.state.status)) {
		sharedFirmwareController.configUpdatedDialog.shown = true;
	}
}

// Handle a reset-worthy save according to the user's preference: "onSave" prompts immediately,
// "onTabClose" defers the prompt to closeTab via resetPromptDue (the flag stays set for the life of
// the tab - the saved file differs from the running configuration until the user resets or re-runs
// it), "disabled" never prompts
function onEditorSaved(tab: ExplorerTab) {
	if (!tab.filename || !warrantsResetPrompt(tab.filename)) {
		return;
	}
	if (settingsStore.editor.configResetPrompt === "onSave") {
		showResetPrompt();
	} else if (settingsStore.editor.configResetPrompt === "onTabClose") {
		tab.resetPromptDue = true;
	}
}

// `transition` is applied per v-window-item and read by Vuetify each time the active item
// changes. `undefined` keeps Vuetify's default sliding tab-transition (correct for clicks
// between adjacent tabs); set to "fade-transition" for one cycle to soften the close case,
// where a slide would lie about a direction the user didn't navigate
const windowItemTransition = ref<string | undefined>(undefined);

function closeTab(id: number) {
	const idx = tabs.value.findIndex((t) => t.id === id);
	if (idx === -1) {
		return;
	}
	const closed = tabs.value[idx];
	tabs.value.splice(idx, 1);

	// resetPromptDue is only set in the "onTabClose" preference, so closing the editor is when its
	// deferred firmware reset / config re-run prompt fires
	if (closed.resetPromptDue) {
		showResetPrompt();
	}

	// If the user just closed the last tab, spawn a fresh browser tab at the default volume so
	// the user lands somewhere usable instead of an empty card
	if (tabs.value.length === 0) {
		tabs.value.push({ id: nextTabId++, kind: "browser", directory: `${defaultVolume.value}:/` });
	}

	if (activeTab.value === id) {
		// The closed tab's path still occupies the current history entry; tell the next URL
		// push (fired by the activeTabSnapshot watcher below) to overwrite it with the fallback
		// tab's path rather than appending. Otherwise Back would walk the user straight back
		// into the file they just closed
		replaceNextUrlChange = true;
		const fallback = tabs.value[Math.max(0, idx - 1)] ?? tabs.value[0];
		windowItemTransition.value = "fade-transition";
		activeTab.value = fallback.id;
		// Vue's transition reads the name when it starts, so resetting on nextTick (after the
		// activeTab update has flushed and the transition is in-flight) restores the default
		// slide for any subsequent tab clicks
		nextTick(() => {
			windowItemTransition.value = undefined;
		});
	}
}

const discardDialog = reactive<{ shown: boolean; pendingId: number | null; filename: string }>({
	shown: false,
	pendingId: null,
	filename: "",
});

// Editor instances by tab id, populated via the template ref so the close-tab prompt can
// trigger a save on the right editor
const editorRefs = new Map<number, { save: () => Promise<boolean> }>();

function setEditorRef(id: number, el: unknown) {
	if (el) {
		editorRefs.set(id, el as { save: () => Promise<boolean> });
	} else {
		editorRefs.delete(id);
	}
}

function requestCloseTab(id: number) {
	const tab = tabs.value.find((t) => t.id === id);
	if (tab?.kind === "editor" && tab.dirty) {
		discardDialog.pendingId = id;
		discardDialog.filename = tab.filename ?? "";
		discardDialog.shown = true;
		return;
	}
	closeTab(id);
}

// Middle-click closes a tab just like its close icon, including the guard the icon expresses
// via :disabled - a middle click has no disabled state of its own
function onTabMiddleClick(tab: ExplorerTab) {
	if (!isLastBrowserTab(tab)) {
		requestCloseTab(tab.id);
	}
}

function closeDiscardDialog() {
	discardDialog.shown = false;
	discardDialog.pendingId = null;
}

async function saveAndClose() {
	const id = discardDialog.pendingId;
	if (id === null) {
		closeDiscardDialog();
		return;
	}
	const editorRef = editorRefs.get(id);
	const saved = editorRef ? await editorRef.save() : true;
	// A failed save keeps the prompt open so the user can retry or pick another option
	if (saved) {
		closeDiscardDialog();
		closeTab(id);
	}
}

function discardAndClose() {
	const id = discardDialog.pendingId;
	closeDiscardDialog();
	if (id !== null) {
		closeTab(id);
	}
}

function cancelClose() {
	closeDiscardDialog();
}

// Browser-level guard against accidental tab/window close while an editor still has unsaved
// changes. The handler stays mounted for the whole Explorer route; preventDefault +
// returnValue together cover both modern and legacy browsers
function onBeforeUnload(e: BeforeUnloadEvent) {
	if (tabs.value.some((t) => t.kind === "editor" && t.dirty)) {
		e.preventDefault();
		e.returnValue = "";
	}
}

onMounted(() => window.addEventListener("beforeunload", onBeforeUnload));
onBeforeUnmount(() => {
	window.removeEventListener("beforeunload", onBeforeUnload);
	// Clear the nav menu chip when the Explorer goes away entirely. Keep-alive deactivation
	// is fine; the count tracks tabs.value which persists alongside the kept-alive component
	uiStore.modifiedEditorCount = 0;
});

// Sync the modified-editor count to the UI store so the nav menu's Explorer chip can read it
// without coupling to the Explorer's tab state directly. The watcher fires on initial flush
// thanks to `immediate`, so a kept-alive remount picks up the right count too
watch(
	() => tabs.value.filter(t => t.kind === "editor" && t.dirty).length,
	(count) => { uiStore.modifiedEditorCount = count; },
	{ immediate: true }
);

function onFileClick(item: FileBrowserItem, directory: string) {
	const fullPath = Path.combine(directory, item.name);

	// Files under the macros directory are runnable; ask to confirm before issuing M98 instead
	// of opening the editor. Everything else opens in the editor tab
	if (Path.startsWith(directory, machineStore.model.directories.macros)) {
		runMacroDialog.filename = item.name;
		runMacroDialog.fullPath = fullPath;
		runMacroDialog.shown = true;
		return;
	}

	// Gcode files under the gcodes directory get the same start/edit prompt the Jobs page uses,
	// so the Explorer is a viable alternative for picking what to print
	if (Path.startsWith(directory, machineStore.model.directories.gCodes)
		&& Path.isGCodePath(item.name, machineStore.model.directories.gCodes)) {
		startJobDialog.filename = item.name;
		startJobDialog.fullPath = fullPath;
		startJobDialog.shown = true;
		return;
	}

	openEditorTab(fullPath);
}

// Context-menu Edit bypasses the run-macro prompt and goes straight to the editor regardless
// of the directory the file lives in
function onFileEdit(item: FileBrowserItem, directory: string) {
	openEditorTab(Path.combine(directory, item.name));
}

// Context-menu Run Macro routes to the same M98 confirm dialog the /macros default click uses
function onFileRunMacro(item: FileBrowserItem, directory: string) {
	runMacroDialog.filename = item.name;
	runMacroDialog.fullPath = Path.combine(directory, item.name);
	runMacroDialog.shown = true;
}

// Context-menu Simulate (gcode directories) mirrors the Jobs page: kick off an M37 dry run
async function onFileSimulate(item: FileBrowserItem, directory: string) {
	await machineStore.sendCode(`M37 P"${Path.escapeFilename(Path.combine(directory, item.name))}"`);
}

// #region Tab drag & drop
// The tab strip accepts two kinds of drags: FileList row drags (same `application/json` payload
// shape as FileList itself) move files into a sibling tab's directory, and drags of the tabs
// themselves reorder the strip

const tabReorderType = "application/x-dwc-tab";
let draggedTabId: number | null = null;

function onTabDragStart(event: DragEvent, tab: ExplorerTab) {
	if (!event.dataTransfer) {
		return;
	}
	// Browsers refuse to start a drag without payload data, but dragover can only inspect the
	// type list - the dragged id itself travels via draggedTabId
	event.dataTransfer.setData(tabReorderType, String(tab.id));
	event.dataTransfer.effectAllowed = "move";
	draggedTabId = tab.id;
}

function onTabDragEnd() {
	draggedTabId = null;
}

function isTabReorderDrag(event: DragEvent): boolean {
	return draggedTabId !== null && event.dataTransfer !== null && Array.from(event.dataTransfer.types).includes(tabReorderType);
}

function reorderTab(sourceId: number, targetId: number) {
	const fromIdx = tabs.value.findIndex((t) => t.id === sourceId);
	const toIdx = tabs.value.findIndex((t) => t.id === targetId);
	if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) {
		return;
	}
	const activeIdxBefore = tabs.value.findIndex((t) => t.id === activeTab.value);
	const [moved] = tabs.value.splice(fromIdx, 1);
	tabs.value.splice(toIdx, 0, moved);

	// A reorder isn't a navigation - when it shifts the active browser tab's ordinal, the URL
	// watcher fires, and its push must overwrite the current history entry instead of appending
	const activeIdxAfter = tabs.value.findIndex((t) => t.id === activeTab.value);
	if (activeIdxAfter !== activeIdxBefore && tabs.value[activeIdxAfter]?.kind === "browser") {
		replaceNextUrlChange = true;
	}
}

interface ExplorerDragPayload {
	type: "dwcFiles";
	directory: string;
	names: Array<string>;
}

function readTabDragPayload(event: DragEvent): ExplorerDragPayload | null {
	if (!event.dataTransfer) {
		return null;
	}
	const raw = event.dataTransfer.getData("application/json");
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw);
		if (parsed?.type === "dwcFiles" && typeof parsed.directory === "string"
			&& Array.isArray(parsed.names)) {
			return parsed as ExplorerDragPayload;
		}
	} catch { /* not our payload */ }
	return null;
}

function isTabDropEligible(tab: ExplorerTab): boolean {
	return tab.kind === "browser" && !!tab.directory;
}

function onTabDragOver(event: DragEvent, tab: ExplorerTab) {
	if (!event.dataTransfer) {
		return;
	}
	if (isTabReorderDrag(event)) {
		if (tab.id !== draggedTabId) {
			event.preventDefault();
			event.dataTransfer.dropEffect = "move";
			(event.currentTarget as HTMLElement | null)?.classList.add("explorer-tab--drop-target");
		}
		return;
	}
	if (!isTabDropEligible(tab)) {
		return;
	}
	if (!Array.from(event.dataTransfer.types).includes("application/json")) {
		return;
	}
	event.preventDefault();
	event.dataTransfer.dropEffect = "move";
	(event.currentTarget as HTMLElement | null)?.classList.add("explorer-tab--drop-target");
}

function onTabDragLeave(event: DragEvent) {
	(event.currentTarget as HTMLElement | null)?.classList.remove("explorer-tab--drop-target");
}

async function onTabDrop(event: DragEvent, tab: ExplorerTab) {
	(event.currentTarget as HTMLElement | null)?.classList.remove("explorer-tab--drop-target");
	if (isTabReorderDrag(event)) {
		event.preventDefault();
		event.stopPropagation();
		reorderTab(draggedTabId!, tab.id);
		draggedTabId = null;
		return;
	}
	if (!isTabDropEligible(tab)) {
		return;
	}
	const payload = readTabDragPayload(event);
	if (!payload || tab.directory === undefined) {
		return;
	}
	if (payload.directory === tab.directory) {
		return;
	}
	event.preventDefault();
	event.stopPropagation();

	const targetLabel = tab.directory.split("/").filter(Boolean).pop() ?? tab.directory;
	let moved = 0;
	for (const name of payload.names) {
		const from = Path.combine(payload.directory, name);
		const to = Path.combine(tab.directory, name);
		try {
			await machineStore.move(from, to);
			moved += 1;
		} catch (e) {
			uiStore.notifyError(e, i18n.global.t("list.fileList.moveError", [name, targetLabel]));
			break;
		}
	}
	if (moved > 0) {
		const message = moved === 1
			? i18n.global.t("list.fileList.movedOne", [payload.names[0], targetLabel])
			: i18n.global.t("list.fileList.movedMany", [moved, targetLabel]);
		uiStore.log(LogLevel.success, message);
		// Switch to the target tab so the user sees the result land
		activeTab.value = tab.id;
	}
}
// #endregion

async function confirmRunMacro() {
	const path = runMacroDialog.fullPath;
	if (!path) {
		return;
	}
	try {
		await machineStore.sendCode(`M98 P"${Path.escapeFilename(path)}"`);
	} catch (e) {
		console.warn(e);
	}
}

function editMacroFromDialog() {
	const path = runMacroDialog.fullPath;
	runMacroDialog.shown = false;
	if (path) {
		openEditorTab(path);
	}
}

async function confirmStartJob() {
	const path = startJobDialog.fullPath;
	if (!path) {
		return;
	}
	try {
		await machineStore.sendCode(`M32 "${Path.escapeFilename(path)}"`);
	} catch (e) {
		console.warn(e);
	}
}

function editJobFromDialog() {
	const path = startJobDialog.fullPath;
	startJobDialog.shown = false;
	if (path) {
		openEditorTab(path);
	}
}

// #region URL sync
function sdPathToRouteParams(sdPath: string): { volume: string; path: string } | null {
	const match = /^(\d+):\/?(.*)$/.exec(sdPath);
	if (!match) {
		return null;
	}
	const volume = match[1];
	const rest = match[2].replace(/^\/+|\/+$/g, "");
	return { volume, path: rest };
}

// The active tab's URL identity: an SD path plus the `t<n>` ordinal that keeps it distinct.
// Browser tabs use their 1-based strip position so two tabs on the same directory don't collide;
// editor tabs are keyed 1:1 by filename (a file opens at most once), so the path alone is
// unique and the URL stays ordinal-free. The watcher below resolves editor URLs by matching
// the path against open editor filenames before considering any ordinal interpretation
const activeTabSnapshot = computed<{ ordinal: number; path: string; editor: boolean } | undefined>(() => {
	const index = tabs.value.findIndex((t) => t.id === activeTab.value);
	if (index === -1) {
		return undefined;
	}
	const tab = tabs.value[index];
	if (tab.kind === "editor") {
		return tab.filename ? { ordinal: 1, path: tab.filename, editor: true } : undefined;
	}
	return tab.directory ? { ordinal: index + 1, path: tab.directory, editor: false } : undefined;
});

let replaceNextUrlChange = false;

watch(activeTabSnapshot, (snapshot) => {
	// Skip while the user has navigated away - the kept-alive component would otherwise push
	// the URL back to /Explorer/... and steal focus from whatever page they actually went to
	if (!snapshot || !isOnExplorerRoute()) {
		return;
	}
	pushUrl(snapshot.ordinal, snapshot.path, snapshot.editor, replaceNextUrlChange);
	replaceNextUrlChange = false;
});

// External URL change (browser back/forward, deep link) -> reconcile state to match. The watch
// fires on every route change including our own pushes; the guards below short-circuit those.
// The default layout wraps router-view in <keep-alive> so this component stays mounted across
// page changes - isOnExplorerRoute() keeps e.g. Jobs's `volume`/`path` params out of tab state
function isOnExplorerRoute(): boolean {
	return route.path === "/Explorer" || route.path.startsWith("/Explorer/");
}
watch(() => `${route.params.tab ?? ""} ${sdPathFromParams(route.params)}`, () => {
	if (!isOnExplorerRoute()) {
		return;
	}
	// Bare /Explorer (no tab / volume / path) - focus the first tab and reset it to the default
	// root so a browser back from `/Explorer/<sub>` actually drops back to the root listing
	// instead of leaving the stale subdirectory on screen
	if (isBareExplorerRoute(route.params)) {
		const first = tabs.value[0];
		if (first) {
			if (first.kind === "browser") {
				const root = `${defaultVolume.value}:/`;
				if (first.directory !== root) {
					first.directory = root;
				}
			}
			if (activeTab.value !== first.id) {
				activeTab.value = first.id;
			}
		}
		return;
	}

	const { editor, tab: ordinalParam } = resolveExplorerRoute(route.params);
	const newPath = sdPathFromParams(route.params);
	if (!newPath) {
		return;
	}

	// Editor URL (the `edit` prefix): focus the matching open editor (files are 1:1 by filename),
	// or open one. The latter is the external-navigation case - e.g. macro Edit - where no editor
	// tab exists yet; without this the file path would fall through to a browser tab and get listed
	if (editor) {
		const editorTab = tabs.value.find((t) => t.kind === "editor" && t.filename === newPath);
		if (editorTab) {
			if (activeTab.value !== editorTab.id) {
				activeTab.value = editorTab.id;
			}
		} else {
			openEditorTab(newPath);
		}
		return;
	}

	// Browser-tab URL: the `t<n>` ordinal addresses exactly one browser tab, so the same path
	// in a second tab doesn't snap focus back to the first tab that happens to share it. No
	// ordinal means tab 1 (or "the first browser tab" when tab 1 is an editor that didn't match
	// above - rare but possible after closing browser tabs)
	const ordinal = ordinalParam ?? 1;
	const targetTab = tabs.value[ordinal - 1];
	if (targetTab?.kind === "browser") {
		if (targetTab.directory !== newPath) {
			targetTab.directory = newPath;
		}
		if (activeTab.value !== targetTab.id) {
			activeTab.value = targetTab.id;
		}
		return;
	}

	// Ordinal points past the open tabs or at an editor that didn't match - steer the first
	// browser tab as a safe default
	const firstBrowser = tabs.value.find((t) => t.kind === "browser");
	if (firstBrowser) {
		if (firstBrowser.directory !== newPath) {
			firstBrowser.directory = newPath;
		}
		if (activeTab.value !== firstBrowser.id) {
			activeTab.value = firstBrowser.id;
		}
	}
});

// Build the URL as a literal string instead of pushing params. vue-router's params-merge for
// optional segments leaks current-route values through both `undefined` and `null`, so sidestep
// the merge and let the route matcher parse our URL. Segment order is `[t<n>|edit] [volume] path...`:
// editor URLs carry the `edit` prefix and no ordinal; browser URLs drop the tab ordinal for the
// first tab and the volume for volume 0, each unless dropping it would misread the next segment
function pushUrl(ordinal: number, path: string, editor: boolean, replace = false) {
	const params = sdPathToRouteParams(path);
	if (!params) {
		return;
	}
	const current = resolveExplorerRoute(route.params);
	if ((current.tab ?? 1) === ordinal && current.editor === editor && sdPathFromParams(route.params) === path) {
		return;
	}

	const pathStr = normalisePathParam(params.path);
	const pathSegments = pathStr.split("/").filter(Boolean);
	// Keep the leading `0/` when the first path segment is purely numeric - `/Explorer/123`
	// would otherwise round-trip as "volume 123" rather than "folder 123 in the default volume"
	const omitVolume = params.volume === "0"
		&& (pathSegments.length === 0 || !/^\d+$/.test(pathSegments[0]));

	const segments: Array<string> = [];
	if (editor) {
		// Editor URLs are ordinal-free (one open editor per file); the `edit` prefix is the signal
		segments.push("edit");
	} else {
		// First segment that ends up in the URL once the optional volume is settled. If it looks
		// like a tab ordinal, the otherwise-omitted first-tab id has to be emitted so a folder
		// named `t2` can't be misread as a second tab
		const leadSegment = omitVolume ? pathSegments[0] : params.volume;
		const emitTab = ordinal > 1
			|| (ordinal === 1 && leadSegment !== undefined && /^t\d+$/.test(leadSegment));
		if (emitTab) {
			segments.push(`t${ordinal}`);
		}
	}
	if (!omitVolume) {
		segments.push(encodeURIComponent(params.volume));
	}
	for (const segment of pathSegments) {
		segments.push(encodeURIComponent(segment));
	}
	const url = segments.length > 0
		? "/Explorer/" + segments.join("/")
		: "/Explorer";
	if (replace) {
		router.replace(url);
	} else {
		router.push(url);
	}
}

// #endregion
</script>
