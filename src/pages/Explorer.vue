<!-- Multi-tab file explorer. Browser tabs host a FileList against a tab-specific entry point
	 (macros, filaments, system, or the volume root); editor tabs host the Monaco editor for a
	 single file. The "+" menu adds browser tabs for each kind; files opened via fileClick get
	 their own editor tab. Per the modernization plan, deep-linking still lives in a follow-up
	 commit -->
<route lang="json">
{
	"meta": {
		"menu": {
			"category": "files",
			"icon": "mdi-folder-multiple",
			"caption": "menu.files.explorer",
			"order": 20
		}
	}
}
</route>

<template>
	<v-card>
		<v-toolbar density="compact" color="surface">
			<v-tabs v-model="activeTab" align-tabs="start" show-arrows density="compact" class="flex-grow-1">
				<v-tab v-for="tab in tabs" :key="tab.id" :value="tab.id" class="text-none">
					<v-icon size="small" class="mr-2">{{ tabIcon(tab) }}</v-icon>
					<span class="text-truncate" style="max-width: 16rem">{{ tabLabel(tab) }}</span>
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
				</v-list>
			</v-menu>
		</v-toolbar>

		<v-window v-model="activeTab" :touch="false">
			<v-window-item v-for="tab in tabs" :key="tab.id" :value="tab.id" eager>
				<MonacoEditor v-if="tab.kind === 'editor' && tab.filename" :filename="tab.filename"
							  @close="closeTab(tab.id)" />
				<FileList v-else :options="{ initialDirectory: initialDirectoryFor(tab) }"
						  :root-directory="rootDirectory" :root-label="$t('list.explorer.root')"
						  :no-items-text="browserKinds[tab.kind as BrowserKind].noItemsKey"
						  :firmware-aware="tab.kind === 'system'"
						  @file-click="onFileClick"
						  @update:directory="(dir) => onDirectoryChanged(tab.id, dir)" />
			</v-window-item>
		</v-window>
	</v-card>

	<ConfirmDialog v-model:shown="runMacroDialog.shown"
				   :title="$t('dialog.runMacro.title', [runMacroDialog.filename])"
				   :prompt="$t('dialog.runMacro.prompt', [runMacroDialog.filename])" icon="mdi-play"
				   @confirmed="confirmRunMacro" />
</template>

<script setup lang="ts">
import type { FileBrowserItem } from "@/composables/useFileBrowser";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog.vue";
import FileList from "@/components/lists/FileList.vue";
import MonacoEditor from "@/components/editor/MonacoEditor.vue";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import Path from "@/utils/path";

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
}

const machineStore = useMachineStore();
const route = useRoute();
const router = useRouter();

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

// Volume root keeps the Explorer "free" - tabs start at their kind's directory but the user can
// navigate up to the volume root and across siblings. Multi-volume support comes with the
// file-browser feature-parity work
const rootDirectory = "0:/";

let nextTabId = 1;

// Honour ?path=... on first mount - either a directory (matched by trailing slash or known
// browser-tab roots) or a filename (anything else). The browser tab kind is inferred from the
// path so we land at e.g. the macros tab when the URL points inside the macros directory
function buildInitialTabs(): Array<ExplorerTab> {
	const queryPath = typeof route.query.path === "string" ? route.query.path : "";
	if (!queryPath) {
		return [{ id: nextTabId++, kind: "macros" }];
	}

	const looksLikeFile = !queryPath.endsWith("/") && /\.[^/]+$/.test(Path.extractFileName(queryPath));
	if (looksLikeFile) {
		return [{ id: nextTabId++, kind: "editor", filename: queryPath }];
	}

	const kind = inferBrowserKind(queryPath);
	return [{ id: nextTabId++, kind, directory: queryPath }];
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

function openEditorTab(filename: string) {
	// If we already have an editor tab for this file, just activate it
	const existing = tabs.value.find((t) => t.kind === "editor" && t.filename === filename);
	if (existing) {
		activeTab.value = existing.id;
		return;
	}
	const tab: ExplorerTab = { id: nextTabId++, kind: "editor", filename };
	tabs.value.push(tab);
	activeTab.value = tab.id;
	syncUrl(filename);
}

function closeTab(id: number) {
	const idx = tabs.value.findIndex((t) => t.id === id);
	if (idx === -1 || tabs.value.length <= 1) {
		return;
	}
	tabs.value.splice(idx, 1);
	if (activeTab.value === id) {
		// Prefer the next-left neighbour, fall back to whatever moved into the closed slot
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

function onDirectoryChanged(tabId: number, dir: string) {
	const tab = tabs.value.find((t) => t.id === tabId);
	if (!tab) {
		return;
	}
	tab.directory = dir;
	if (tabId === activeTab.value) {
		syncUrl(dir);
	}
}

function syncUrl(path: string) {
	if (route.query.path === path) {
		return;
	}
	router.replace({ query: { ...route.query, path } });
}

watch(activeTab, (id) => {
	const tab = tabs.value.find((t) => t.id === id);
	if (!tab) {
		return;
	}
	if (tab.kind === "editor" && tab.filename) {
		syncUrl(tab.filename);
	} else if (tab.directory) {
		syncUrl(tab.directory);
	}
});
</script>
