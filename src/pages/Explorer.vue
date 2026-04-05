<!-- Multi-tab file explorer. Each tab hosts its own FileList against a tab-specific entry point
	 (macros, filaments, system, or the volume root). The "+" menu adds tabs for each kind; tabs
	 close from the close-x on the v-tab once more than one is open. Per the modernization plan,
	 deep-linking, multi-select, drag/drop, rename/delete, upload and ZIP download still live in
	 follow-up commits -->
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
					<v-icon size="small" class="mr-2">{{ tabKinds[tab.kind].icon }}</v-icon>
					{{ $t(tabKinds[tab.kind].captionKey) }}
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
					<v-list-item v-for="(meta, kind) in tabKinds" :key="kind" @click="addTab(kind as TabKind)">
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
				<FileList :options="{ initialDirectory: tabKinds[tab.kind].directory() }"
						  :root-directory="rootDirectory" :root-label="$t('list.explorer.root')"
						  :no-items-text="tabKinds[tab.kind].noItemsKey" @file-click="onFileClick" />
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
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { LogLevel, useUiStore } from "@/stores/ui";
import Path from "@/utils/path";

type TabKind = "macros" | "filaments" | "system" | "files";

interface TabKindMeta {
	icon: string;
	captionKey: string;
	noItemsKey: string;
	directory(): string;
}

interface ExplorerTab {
	id: number;
	kind: TabKind;
}

const machineStore = useMachineStore();
const uiStore = useUiStore();

const tabKinds: Record<TabKind, TabKindMeta> = {
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
const tabs = ref<Array<ExplorerTab>>([{ id: nextTabId++, kind: "macros" }]);
const activeTab = ref<number>(tabs.value[0].id);

const runMacroDialog = reactive({
	shown: false,
	filename: "",
	fullPath: "",
});

function addTab(kind: TabKind) {
	const tab = { id: nextTabId++, kind };
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
		// Prefer the next-left neighbour, fall back to whatever moved into the closed slot
		const fallback = tabs.value[Math.max(0, idx - 1)] ?? tabs.value[0];
		activeTab.value = fallback.id;
	}
}

function onFileClick(item: FileBrowserItem, directory: string) {
	const fullPath = Path.combine(directory, item.name);
	const lower = item.name.toLowerCase();

	if (Path.startsWith(directory, machineStore.model.directories.macros)) {
		runMacroDialog.filename = item.name;
		runMacroDialog.fullPath = fullPath;
		runMacroDialog.shown = true;
		return;
	}

	if (lower.endsWith(".bin") || lower.endsWith(".uf2")) {
		// Firmware download is part of the feature-parity work; surface a placeholder until then
		uiStore.log(LogLevel.warning, i18n.global.t("list.explorer.downloadNotPorted"), item.name);
		return;
	}

	// Generic edit path goes through Monaco, which is also not ported yet
	uiStore.log(LogLevel.warning, i18n.global.t("list.explorer.editorNotPorted"), item.name);
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
</script>
