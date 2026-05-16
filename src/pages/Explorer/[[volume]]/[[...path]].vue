<!-- Multi-tab file explorer. URL scheme `/Explorer/[volume?]/[path*?]` - `volume` is the SD
	 volume index (defaults to 0) and `path` is the absolute path within that volume. Browser
	 tabs host a FileList against a tab-specific entry point (macros, filaments, system, or the
	 volume root); editor tabs host the Monaco editor for a single file. The "+" menu adds
	 browser tabs for each kind plus a per-volume entry when the machine reports more than one
	 volume. menu.path is set explicitly because the route template (parametrised) can't be used
	 as a navigation target -->
<route lang="json">
{
	"meta": {
		"menu": {
			"category": "files",
			"icon": "mdi-folder-multiple",
			"caption": "menu.files.explorer",
			"order": 20,
			"path": "/Explorer"
		}
	}
}
</route>

<script lang="ts">
// Pre-fetch the active tab's content during navigation: a directory listing for browser tabs,
// the file contents for editor tabs. Result is consumed in <script setup> to seed either the
// initial FileList or the MonacoEditor. `lazy: true` keeps the route transition snappy on slow
// boards - the editor and file list render their own loading state in the meantime
import { defineBasicLoader } from "vue-router/experimental";

import { useMachineStore } from "@/stores/machine";
import Path from "@/utils/path";

interface ExplorerInitialPayload {
	path: string;
	kind: "directory" | "editor" | "none";
	files?: unknown[];
	content?: string;
}

function looksLikeFile(path: string): boolean {
	if (!path) return false;
	return !path.endsWith("/") && /\.[^/]+$/.test(Path.extractFileName(path));
}

// Build an SD path like `0:/sys/accelerometer` from the route params. Both segments are
// optional (default volume 0, default empty path) so the same route file matches the bare
// `/Explorer` URL and the fully-qualified `/Explorer/0/sys/foo`. vue-router-vite emits the
// catchall as a single `:path(.*)?` segment (one string with embedded slashes), but we accept
// both string and array shapes for defensive future-proofing
function sdPathFromParams(params: Record<string, unknown>): string {
	const volumeRaw = params.volume;
	const volume = Array.isArray(volumeRaw)
		? (volumeRaw[0] as string | undefined) ?? "0"
		: typeof volumeRaw === "string" ? volumeRaw : "0";
	const rawPath = params.path;
	let inner = "";
	if (Array.isArray(rawPath)) {
		inner = (rawPath as Array<string>).join("/");
	} else if (typeof rawPath === "string") {
		inner = rawPath;
	}
	inner = inner.replace(/^\/+|\/+$/g, "");
	return inner ? `${volume}:/${inner}` : `${volume}:/`;
}

function isBareExplorerRoute(params: Record<string, unknown>): boolean {
	const raw = params.path;
	if (raw === undefined || raw === null || raw === "") return true;
	if (Array.isArray(raw) && raw.length === 0) return true;
	return false;
}

export const useExplorerInitialData = defineBasicLoader(async (to): Promise<ExplorerInitialPayload> => {
	const params = to.params as Record<string, unknown>;
	if (isBareExplorerRoute(params)) {
		return { path: "", kind: "none" };
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
	<v-card>
		<v-toolbar density="compact" color="surface">
			<v-tabs v-model="activeTab" align-tabs="start" show-arrows density="compact" class="flex-grow-1">
				<v-tab v-for="tab in tabs" :key="tab.id" :value="tab.id" class="text-none">
					<v-icon size="small" class="mr-2">{{ tabIcon(tab) }}</v-icon>
					<span class="explorer-tab-label text-truncate">{{ tabLabel(tab) }}</span>
					<v-btn v-if="tabs.length > 1" variant="plain" size="x-small" density="compact"
						   class="ml-2" :title="$t('list.explorer.closeTab')" @click.stop="closeTab(tab.id)">
						<v-icon size="x-small">mdi-close</v-icon>
					</v-btn>
				</v-tab>
			</v-tabs>

			<v-menu>
				<template #activator="{ props: activatorProps }">
					<v-btn v-bind="activatorProps" variant="text" icon
						   :title="$t('list.explorer.newTab')">
						<v-icon>mdi-plus</v-icon>
					</v-btn>
				</template>
				<v-list density="compact">
					<v-list-item v-for="(meta, kind) in browserKinds" :key="kind"
								 @click="addBrowserTab(kind as BrowserKind)">
						<template #prepend>
							<v-icon>{{ meta.icon }}</v-icon>
						</template>
						<v-list-item-title>{{ $t(meta.captionKey) }}</v-list-item-title>
					</v-list-item>
					<v-divider v-if="extraVolumes.length > 0" />
					<v-list-item v-for="vol in extraVolumes" :key="`vol-${vol}`"
								 @click="addVolumeTab(vol)">
						<template #prepend>
							<v-icon>mdi-sd</v-icon>
						</template>
						<v-list-item-title>
							{{ $t("list.explorer.tabs.volume", [vol]) }}
						</v-list-item-title>
					</v-list-item>
				</v-list>
			</v-menu>
		</v-toolbar>

		<v-window v-model="activeTab" :touch="false">
			<v-window-item v-for="tab in tabs" :key="tab.id" :value="tab.id" eager>
				<MonacoEditor v-if="tab.kind === 'editor' && tab.filename" :filename="tab.filename"
							  :initial-content="tab.initialContent" @close="closeTab(tab.id)" />
				<FileList v-else v-model:directory="tab.directory"
						  :options="optionsForTab(tab)"
						  :root-directory="rootForTab(tab)" :root-label="$t('list.explorer.root')"
						  :no-items-text="browserKinds[tab.kind as BrowserKind].noItemsKey"
						  :firmware-aware="tab.kind === 'system'"
						  @file-click="onFileClick" />
			</v-window-item>
		</v-window>
	</v-card>

	<ConfirmDialog v-model:shown="runMacroDialog.shown"
				   :title="$t('dialog.runMacro.title', [runMacroDialog.filename])"
				   :prompt="$t('dialog.runMacro.prompt', [runMacroDialog.filename])" icon="mdi-play"
				   @confirmed="confirmRunMacro" />

	<!-- Shared firmware-install dialogs - one pair per Explorer page, fed by whichever child
		 FileList triggered the upload through the injected controller -->
	<FirmwareUpdateDialog v-model:shown="sharedFirmwareController.firmwareDialog.shown"
						  :plan="sharedFirmwareController.firmwareDialog.plan"
						  @confirmed="sharedFirmwareController.onFirmwareUpdateConfirmed"
						  @cancelled="sharedFirmwareController.onFirmwareUpdateCancelled" />

	<ConfigUpdatedDialog v-model:shown="sharedFirmwareController.configUpdatedDialog.shown" />
</template>

<script setup lang="ts">
// useMachineStore + Path are already imported in the module-scope <script> block above
import type { FileBrowserItem } from "@/composables/useFileBrowser";
import ConfigUpdatedDialog from "@/components/dialogs/ConfigUpdatedDialog.vue";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog.vue";
import FileList from "@/components/lists/FileList.vue";
import FirmwareUpdateDialog from "@/components/dialogs/FirmwareUpdateDialog.vue";
import MonacoEditor from "@/components/editor/MonacoEditor.vue";
import {
	firmwareInstallControllerKey, useFirmwareInstallController
} from "@/composables/useFirmwareInstallController";
import i18n from "@/i18n";

type BrowserKind = "macros" | "filaments" | "system" | "files";
type TabKind = BrowserKind | "editor";

interface BrowserKindMeta {
	icon: string;
	captionKey: string;
	noItemsKey: string;
	directory(): string;
}

interface ExplorerTab {
	id: number;
	kind: TabKind;
	/**
	 * Filename for editor tabs (undefined for browser tabs)
	 */
	filename?: string;
	/**
	 * Most recently observed directory for browser tabs - mirrors the FileList's internal state
	 * so we can sync the active tab's path to the URL
	 */
	directory?: string;
	/**
	 * One-shot pre-fetched data from the route loader. Cleared after the first render so a
	 * later refresh refetches from the board
	 */
	initialFiles?: Array<FileBrowserItem>;
	/**
	 * Pre-fetched editor content from the route loader (one-shot, like initialFiles)
	 */
	initialContent?: string;
}

const machineStore = useMachineStore();
const route = useRoute();
const router = useRouter();

const { data: initialPayload } = useExplorerInitialData();

// Single shared firmware-install controller for all child FileLists (one per Explorer tab).
// Without this, each FileList would mount its own FirmwareUpdateDialog + ConfigUpdatedDialog
// pair - cheap when hidden but redundant scaffolding. provide() hooks the children up via
// inject() in FileList.vue
const sharedFirmwareController = useFirmwareInstallController();
provide(firmwareInstallControllerKey, sharedFirmwareController);

const browserKinds: Record<BrowserKind, BrowserKindMeta> = {
	macros: {
		icon: "mdi-polymer",
		captionKey: "list.explorer.tabs.macros",
		noItemsKey: "list.macro.noMacros",
		directory: () => machineStore.model.directories.macros,
	},
	filaments: {
		icon: "mdi-radiobox-marked",
		captionKey: "list.explorer.tabs.filaments",
		noItemsKey: "list.filament.noFilaments",
		directory: () => machineStore.model.directories.filaments,
	},
	system: {
		icon: "mdi-cog",
		captionKey: "list.explorer.tabs.system",
		noItemsKey: "list.system.noFiles",
		directory: () => machineStore.model.directories.system,
	},
	files: {
		icon: "mdi-folder",
		captionKey: "list.explorer.tabs.files",
		noItemsKey: "list.baseFileList.noFiles",
		directory: () => "0:/",
	},
};

// Per-volume "Files" entries in the +menu: one for each non-default volume the board reports.
// Volume 0 is already covered by the standard "files" entry
const extraVolumes = computed<Array<number>>(() => {
	const volumes = machineStore.model.volumes ?? [];
	return volumes
		.map((_, idx) => idx)
		.filter((idx) => idx > 0);
});

let nextTabId = 1;

// First-mount URL → tab seed. Reads the SD path from route params (`/Explorer/0/sys/foo`
// becomes `0:/sys/foo`); a bare `/Explorer` URL opens the default macros tab. If the loader
// already resolved, weave its result into the initial tab so the first render has data
function buildInitialTabs(): Array<ExplorerTab> {
	if (isBareExplorerRoute(route.params as Record<string, unknown>)) {
		return [{ id: nextTabId++, kind: "macros" }];
	}
	const initialPath = sdPathFromParams(route.params as Record<string, unknown>);

	const payload = initialPayload.value;
	if (looksLikeFile(initialPath)) {
		return [{
			id: nextTabId++,
			kind: "editor",
			filename: initialPath,
			initialContent: payload && payload.path === initialPath && payload.kind === "editor"
				? payload.content
				: undefined,
		}];
	}

	const kind = inferBrowserKind(initialPath);
	return [{
		id: nextTabId++,
		kind,
		directory: initialPath,
		initialFiles: payload && payload.path === initialPath && payload.kind === "directory"
			? (payload.files as Array<FileBrowserItem> | undefined) ?? undefined
			: undefined,
	}];
}

function inferBrowserKind(dir: string): BrowserKind {
	if (Path.startsWith(dir, machineStore.model.directories.macros)) {
		return "macros";
	}
	if (Path.startsWith(dir, machineStore.model.directories.filaments)) {
		return "filaments";
	}
	if (Path.startsWith(dir, machineStore.model.directories.system)) {
		return "system";
	}
	return "files";
}

const tabs = ref<Array<ExplorerTab>>(buildInitialTabs());
const activeTab = ref<number>(tabs.value[0].id);

function initialDirectoryFor(tab: ExplorerTab): string {
	if (tab.directory) {
		return tab.directory;
	}
	return browserKinds[tab.kind as BrowserKind].directory();
}

function optionsForTab(tab: ExplorerTab) {
	return {
		initialDirectory: initialDirectoryFor(tab),
		initialFiles: tab.initialFiles,
	};
}

// Tabs at non-default volumes need to root the breadcrumbs at *their* volume's root rather
// than 0:/ so the "up" affordance stops at the right place
function rootForTab(tab: ExplorerTab): string {
	const dir = initialDirectoryFor(tab);
	const match = /^(\d+):/.exec(dir);
	return match ? `${match[1]}:/` : "0:/";
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
	} else if (payload.kind === "directory" && tab.kind !== "editor" && tab.directory === payload.path
			&& tab.initialFiles === undefined) {
		tab.initialFiles = (payload.files as Array<FileBrowserItem> | undefined) ?? undefined;
	}
});

const runMacroDialog = reactive({
	shown: false,
	filename: "",
	fullPath: "",
});

function tabIcon(tab: ExplorerTab): string {
	if (tab.kind === "editor") {
		return "mdi-file-document-edit";
	}
	return browserKinds[tab.kind as BrowserKind].icon;
}

function tabLabel(tab: ExplorerTab): string {
	if (tab.kind === "editor" && tab.filename) {
		return Path.extractFileName(tab.filename);
	}
	return i18n.global.t(browserKinds[tab.kind as BrowserKind].captionKey);
}

function addBrowserTab(kind: BrowserKind) {
	const tab: ExplorerTab = { id: nextTabId++, kind };
	tabs.value.push(tab);
	activeTab.value = tab.id;
}

function addVolumeTab(volume: number) {
	const tab: ExplorerTab = { id: nextTabId++, kind: "files", directory: `${volume}:/` };
	tabs.value.push(tab);
	activeTab.value = tab.id;
}

function openEditorTab(filename: string) {
	const existing = tabs.value.find((t) => t.kind === "editor" && t.filename === filename);
	if (existing) {
		activeTab.value = existing.id;
		return;
	}
	const tab: ExplorerTab = { id: nextTabId++, kind: "editor", filename };
	tabs.value.push(tab);
	activeTab.value = tab.id;
}

function closeTab(id: number) {
	const idx = tabs.value.findIndex((t) => t.id === id);
	if (idx === -1 || tabs.value.length <= 1) {
		return;
	}
	tabs.value.splice(idx, 1);
	if (activeTab.value === id) {
		const fallback = tabs.value[Math.max(0, idx - 1)] ?? tabs.value[0];
		activeTab.value = fallback.id;
	}
}

function onFileClick(item: FileBrowserItem, directory: string) {
	const fullPath = Path.combine(directory, item.name);

	if (Path.startsWith(directory, machineStore.model.directories.macros)) {
		runMacroDialog.filename = item.name;
		runMacroDialog.fullPath = fullPath;
		runMacroDialog.shown = true;
		return;
	}

	openEditorTab(fullPath);
}

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

// ---- URL sync -------------------------------------------------------------------------------

// Pull volume + path string out of an SD path so the router can build the matching URL.
// vue-router-vite expects the catchall as a single string (one segment with `/` separators)
function sdPathToRouteParams(sdPath: string): { volume: string; path: string } | null {
	const match = /^(\d+):\/?(.*)$/.exec(sdPath);
	if (!match) return null;
	const volume = match[1];
	const rest = match[2].replace(/^\/+|\/+$/g, "");
	return { volume, path: rest };
}

const activePath = computed<string | undefined>(() => {
	const tab = tabs.value.find((t) => t.id === activeTab.value);
	if (!tab) {
		return undefined;
	}
	return tab.kind === "editor" ? tab.filename : tab.directory;
});

watch(activePath, (path) => {
	if (typeof path === "string") {
		pushUrl(path);
	}
});

// External URL change (browser back/forward, deep link) → reconcile state to match. The watch
// fires on every route.params change including our own pushes; equality checks against the
// current tab's path short-circuit those
watch(() => sdPathFromParams(route.params as Record<string, unknown>), (newPath) => {
	if (isBareExplorerRoute(route.params as Record<string, unknown>) || !newPath) {
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

function pushUrl(path: string) {
	const params = sdPathToRouteParams(path);
	if (!params) {
		return;
	}
	const currentPath = sdPathFromParams(route.params as Record<string, unknown>);
	if (currentPath === path) {
		return;
	}
	router.push({ params: { volume: params.volume, path: params.path } });
}
</script>

<style scoped>
/* Cap tab labels relative to the toolbar so the close button + new-tab menu stay visible.
   8rem keeps a sensible width on xs while still allowing room to read most directory names */
.explorer-tab-label {
	max-width: 8rem;
}
@media (min-width: 600px) {
	.explorer-tab-label { max-width: 12rem; }
}
@media (min-width: 960px) {
	.explorer-tab-label { max-width: 16rem; }
}
</style>
