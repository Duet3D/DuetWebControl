<route lang="json">
{
	"meta": {
		"keepAlive": true,
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

function looksLikeFile(path: string): boolean {
	if (!path) {
		return false;
	}
	return !path.endsWith("/") && /\.[^/]+$/.test(Path.extractFileName(path));
}

// vue-router-vite parses `/Explorer/0/sys/foo` positionally as tab="0", volume="sys" because
// `[tab]` comes first. The tab id is always non-numeric (e.g. "t2"); a numeric first segment is
// really the volume, so shift the values one slot left in that case
function resolveTabAndVolume(params: ExplorerRouteParams): {
	tab: string | undefined; volume: string; path: string;
} {
	let tab = params.tab;
	let volume = params.volume;
	let path = normalisePathParam(params.path);

	if (tab !== undefined && /^\d+$/.test(tab)) {
		// First segment is a volume number - shift values left
		path = volume !== undefined
			? (path !== "" ? `${volume}/${path}` : volume)
			: path;
		volume = tab;
		tab = undefined;
	} else if (tab !== undefined && !/^t\d+$/.test(tab)) {
		// First segment is neither a volume id nor a tab id (e.g. `/Explorer/sys/config.g`) -
		// treat it as a path segment under the default volume, shifting both following slots
		// into `path` as well
		const prefix = volume !== undefined ? `${tab}/${volume}` : tab;
		path = path !== "" ? `${prefix}/${path}` : prefix;
		volume = undefined;
		tab = undefined;
	}

	return {
		tab,
		volume: volume ?? "0",
		path: path.replace(/^\/+|\/+$/g, ""),
	};
}

function sdPathFromParams(params: ExplorerRouteParams): string {
	const { volume, path } = resolveTabAndVolume(params);
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
	const machineStore = useMachineStore();
	if (!machineStore.isConnected) {
		return { path, kind: looksLikeFile(path) ? "editor" : "directory" };
	}
	try {
		if (looksLikeFile(path)) {
			const content = await machineStore.download({ filename: path, type: "text" }, false, false, false);
			return { path, kind: "editor", content };
		}
		const files = await machineStore.getFileList(path);
		return { path, kind: "directory", files };
	} catch (e) {
		console.warn("Explorer loader failed", e);
		return { path, kind: looksLikeFile(path) ? "editor" : "directory" };
	}
}, { lazy: true });
</script>

<template>
	<v-card class="explorer-card dwc-page-fill d-flex flex-column">
		<v-toolbar v-if="tabs.length > 1" density="compact" color="surface" class="flex-shrink-0">
			<v-tabs v-model="activeTab" align-tabs="start" show-arrows density="compact" class="flex-grow-1">
				<v-tab v-for="tab in tabs" :key="tab.id" :value="tab.id" class="text-none"
					   :color="isTabDirty(tab) ? 'warning' : undefined"
					   @dragover="onTabDragOver($event, tab)"
					   @dragleave="onTabDragLeave"
					   @drop="onTabDrop($event, tab)">
					<v-icon size="small" class="mr-2">{{ tabIcon(tab) }}</v-icon>
					<span class="explorer-tab-label text-truncate">{{ tabLabel(tab) }}{{ isTabDirty(tab) ? " *" : "" }}</span>
					<v-btn v-if="tabs.length > 1" variant="text" size="small" density="comfortable"
						   icon class="ml-2" :title="$t('list.explorer.closeTab')"
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
				<MonacoEditor v-if="tab.kind === 'editor' && tab.filename" :filename="tab.filename"
							  :initial-content="tab.initialContent" @dirty="tab.dirty = $event" />
				<FileList v-else v-model:directory="tab.directory"
						  :options="optionsForTab(tab)"
						  :root-directory="rootForTab(tab)" :root-label="rootLabelFor(tab)"
						  no-items-text="list.baseFileList.noFiles" no-view-mode
						  :firmware-aware="isUnderSystem(tab.directory)"
						  @file-click="onFileClick" @file-edit="onFileEdit"
						  @file-run-macro="onFileRunMacro"
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
							<v-list density="compact">
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
			<v-btn color="blue-darken-1" variant="text" type="button" @click="editMacroFromDialog">
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
			<v-btn color="blue-darken-1" variant="text" type="button" @click="editJobFromDialog">
				<v-icon class="mr-1">mdi-file-document-edit</v-icon>
				{{ $t("list.fileList.edit") }}
			</v-btn>
		</template>
	</ConfirmDialog>

	<ConfirmDialog v-model:shown="discardDialog.shown" :title="$t('dialog.fileEdit.discardTitle')"
				   :prompt="$t('dialog.fileEdit.discardPrompt')" icon="mdi-alert"
				   @confirmed="confirmDiscard" />

	<FirmwareUpdateDialog v-model:shown="sharedFirmwareController.firmwareDialog.shown"
						  :plan="sharedFirmwareController.firmwareDialog.plan"
						  @confirmed="sharedFirmwareController.onFirmwareUpdateConfirmed"
						  @cancelled="sharedFirmwareController.onFirmwareUpdateCancelled" />

	<ConfigUpdatedDialog v-model:shown="sharedFirmwareController.configUpdatedDialog.shown" />
</template>

<script setup lang="ts">
import type { FileBrowserItem } from "@/composables/useFileBrowser";
import { useGcodeThumbnails } from "@/composables/useGcodeThumbnails";
import ConfigUpdatedDialog from "@/components/dialogs/ConfigUpdatedDialog.vue";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog.vue";
import FileList from "@/components/lists/FileList.vue";
import FirmwareUpdateDialog from "@/components/dialogs/FirmwareUpdateDialog.vue";
import JobThumbnailCell from "@/components/lists/JobThumbnailCell.vue";
import MonacoEditor from "@/components/editor/MonacoEditor.vue";
import {
	firmwareInstallControllerKey, useFirmwareInstallController
} from "@/composables/useFirmwareInstallController";
import i18n from "@/i18n";
import { LogLevel, useUiStore } from "@/stores/ui";

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
	/** Window scroll position snapshot from when this tab was last active; restored on re-entry */
	scrollY?: number;
	/** Tracks unsaved Monaco changes (editor tabs only); drives the close confirm and unload guard */
	dirty?: boolean;
}

const machineStore = useMachineStore();
const uiStore = useUiStore();
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

// First-mount URL -> tab seed. Bare `/Explorer` opens a single browser tab at `0:/`;
// `/Explorer/0/sys/foo` opens the matching directory tab; a file-shaped path opens an editor tab
// Each path identifies its tab uniquely (a file can only be opened once) so URLs no longer carry
// a separate `t<n>` tab identifier - the [[tab]] route segment is left in place for legacy URL
// compatibility but is never populated when DWC pushes a new URL
function buildInitialTabs(): Array<ExplorerTab> {
	const params = route.params;
	if (isBareExplorerRoute(params)) {
		return [{ id: nextTabId++, kind: "browser", directory: "0:/" }];
	}
	const initialPath = sdPathFromParams(params);
	const payload = initialPayload.value;
	if (looksLikeFile(initialPath)) {
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
				initialContent: payload && payload.path === initialPath && payload.kind === "editor"
					? payload.content
					: undefined,
			},
		];
	}
	return [{
		id: nextTabId++,
		kind: "browser",
		directory: initialPath,
		initialFiles: payload && payload.path === initialPath && payload.kind === "directory"
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
// browser tab content is technically still there when the user switches away - but the window
// scroll position is a single document-level value, not per-tab. On every tab change we stash
// the current scroll into the OUTGOING tab and restore the INCOMING tab's value (or scroll to
// 0 if it never had one). nextTick lets v-window finish its display swap so the page height
// reflects the incoming tab before we set scrollTop
watch(activeTab, (toId, fromId) => {
	const outgoing = tabs.value.find((t) => t.id === fromId);
	if (outgoing) {
		outgoing.scrollY = window.scrollY;
	}
	const incoming = tabs.value.find((t) => t.id === toId);
	nextTick(() => {
		window.scrollTo({ top: incoming?.scrollY ?? 0, behavior: "instant" });
	});
});

// Single shared thumbnail fetcher across all browser tabs. Switching tabs mid-fetch cancels
// the previous one (acceptable: the cache holds whatever did complete and the next visit hits
// it). The Path.isGCodePath filter inside the composable guarantees no-op for /sys, /macros,
// ... so non-gcode directories never pay the per-row fetch cost
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

function isUnderSystem(dir: string | undefined): boolean {
	if (!dir) {
		return false;
	}
	return Path.startsWith(dir, machineStore.model.directories.system);
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
	tabs.value.splice(idx, 1);

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

const discardDialog = reactive<{ shown: boolean; pendingId: number | null }>({
	shown: false,
	pendingId: null,
});

function requestCloseTab(id: number) {
	const tab = tabs.value.find((t) => t.id === id);
	if (tab?.kind === "editor" && tab.dirty) {
		discardDialog.pendingId = id;
		discardDialog.shown = true;
		return;
	}
	closeTab(id);
}

function confirmDiscard() {
	const id = discardDialog.pendingId;
	discardDialog.pendingId = null;
	if (id !== null) {
		closeTab(id);
	}
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

// #region Cross-tab drop
// Accept FileList row drags (same `application/json` payload shape as FileList itself) on a
// sibling tab's tab strip - lets the user move files between tabs without typing paths
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
	if (!event.dataTransfer || !isTabDropEligible(tab)) {
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

// Active tab snapshot - the SD path is the URL. Each tab is uniquely identified by its path
// (a file can only be opened once), so the URL no longer needs a separate tab identifier
const activeTabSnapshot = computed<string | undefined>(() => {
	const tab = tabs.value.find((t) => t.id === activeTab.value);
	if (!tab) {
		return undefined;
	}
	return (tab.kind === "editor" ? tab.filename : tab.directory) ?? undefined;
});

let replaceNextUrlChange = false;

watch(activeTabSnapshot, (sdPath) => {
	// Skip while the user has navigated away - the kept-alive component would otherwise push
	// the URL back to /Explorer/... and steal focus from whatever page they actually went to
	if (!sdPath || !isOnExplorerRoute()) {
		return;
	}
	pushUrl(sdPath, replaceNextUrlChange);
	replaceNextUrlChange = false;
});

// External URL change (browser back/forward, deep link) -> reconcile state to match. The watch
// fires on every route.params change including our own pushes; equality checks against the
// current tab's path short-circuit those. The default layout wraps router-view in <keep-alive>
// so this component stays mounted across page changes - guard with isOnExplorerRoute() to
// avoid feeding e.g. Jobs's `volume`/`path` params back into the Explorer's tab state
function isOnExplorerRoute(): boolean {
	return route.path === "/Explorer" || route.path.startsWith("/Explorer/");
}
watch(() => sdPathFromParams(route.params), (newPath) => {
	if (!isOnExplorerRoute()) {
		return;
	}
	// Bare /Explorer (no volume / path) - reset the active browser tab to the default root so a
	// browser back from `/Explorer/<vol>/<sub>` to `/Explorer` actually drops back to the root
	// listing instead of leaving the stale subdirectory on screen
	if (isBareExplorerRoute(route.params)) {
		const tab = tabs.value.find((t) => t.id === activeTab.value);
		if (tab && tab.kind === "browser") {
			const root = `${defaultVolume.value}:/`;
			if (tab.directory !== root) {
				tab.directory = root;
			}
		}
		return;
	}
	if (!newPath) {
		return;
	}

	const matchingTab = tabs.value.find((tab) => {
		if (tab.kind === "editor") {
			return tab.filename === newPath;
		}
		return tab.directory === newPath;
	});

	if (matchingTab) {
		if (activeTab.value !== matchingTab.id) {
			activeTab.value = matchingTab.id;
		}
		return;
	}

	if (looksLikeFile(newPath)) {
		openEditorTab(newPath);
		return;
	}

	const tab = tabs.value.find((t) => t.id === activeTab.value);
	if (!tab || tab.kind === "editor") {
		return;
	}
	if (tab.directory !== newPath) {
		tab.directory = newPath;
	}
});

function pushUrl(path: string, replace = false) {
	const params = sdPathToRouteParams(path);
	if (!params) {
		return;
	}
	const currentPath = sdPathFromParams(route.params);
	if (currentPath === path) {
		return;
	}
	// Build the URL as a literal string instead of pushing params. vue-router's params-merge for
	// optional segments leaks current-route values through both `undefined` and `null` (renders
	// the volume twice as a result), so we sidestep the merge entirely and let the route matcher
	// just parse our URL. The [[tab]] segment in the route file is kept for legacy URLs but
	// never populated here - resolveTabAndVolume's shift-left handles old-format input
	const pathStr = normalisePathParam(params.path);
	const pathSegments = pathStr.split("/").filter(Boolean);
	// Omit the leading `0/` for the default volume unless the first path segment is purely
	// numeric - `/Explorer/123` would otherwise round-trip as "volume 123" rather than "folder
	// 123 in the default volume" (covers editor URLs too, they share this builder)
	const omitVolume = params.volume === "0"
		&& (pathSegments.length === 0 || !/^\d+$/.test(pathSegments[0]));
	const segments: Array<string> = [];
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

<style scoped>
.explorer-tab-label {
	max-width: 8rem;
}
@media (min-width: 600px) {
	.explorer-tab-label { max-width: 12rem; }
}
@media (min-width: 960px) {
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
