<!-- File-browser table. Toolbar shows the current path with click-to-navigate breadcrumbs and the
	 standard write actions (new file, new directory, delete, rename, refresh). Multi-select via the
	 checkbox column gates delete (multi) and rename (single). Drag/drop, upload and ZIP download
	 still live in follow-up commits -->
<template>
	<v-card>
		<v-toolbar density="compact" color="surface" class="px-2">
			<v-btn v-show="canGoUp" icon variant="text" :title="$t('list.baseFileList.goUp')"
				   @click="browser.goUp()">
				<v-icon>mdi-arrow-up</v-icon>
			</v-btn>

			<v-breadcrumbs :items="breadcrumbItems" density="compact" class="pa-0">
				<template #divider>
					<v-icon size="small">mdi-chevron-right</v-icon>
				</template>
				<template #item="{ item }">
					<a v-if="item.href" href="javascript:void(0)" class="text-body-2"
					   @click.prevent="browser.loadDirectory(item.href)">
						{{ item.title }}
					</a>
					<span v-else class="text-body-2">{{ item.title }}</span>
				</template>
			</v-breadcrumbs>

			<v-spacer />

			<v-btn v-if="!noRename && selection.length === 1" variant="text" icon
				   :disabled="uiStore.uiFrozen" :title="$t('button.rename.caption')" @click="startRename">
				<v-icon>mdi-rename-box</v-icon>
			</v-btn>

			<v-btn v-if="!noDelete && selection.length > 0" variant="text" icon
				   :disabled="uiStore.uiFrozen" :title="$t('button.delete.caption')" @click="startDelete">
				<v-icon>mdi-delete</v-icon>
			</v-btn>

			<v-btn v-if="!noNewFile" variant="text" icon :disabled="uiStore.uiFrozen"
				   :title="$t('button.newFile.caption')" @click="startNewFile">
				<v-icon>mdi-file-plus</v-icon>
			</v-btn>

			<v-btn v-if="!noNewDirectory" variant="text" icon :disabled="uiStore.uiFrozen"
				   :title="$t('button.newDirectory.caption')" @click="startNewDirectory">
				<v-icon>mdi-folder-plus</v-icon>
			</v-btn>

			<v-btn variant="text" icon :loading="browser.loading.value" :disabled="uiStore.uiFrozen"
				   :title="$t('button.refresh.caption')" @click="browser.refresh()">
				<v-icon>mdi-refresh</v-icon>
			</v-btn>
		</v-toolbar>

		<v-data-table v-model="selection" :headers="effectiveHeaders" :items="browser.filelist.value"
					  item-value="name" :loading="browser.loading.value" :sort-by="internalSortBy" must-sort
					  hide-default-footer items-per-page="-1" density="compact" show-select
					  :no-data-text="$t(noItemsText)" @click:row="onRowClick">
			<template #item.name="{ item }">
				<div class="d-flex align-center">
					<v-icon size="small" class="mr-2">
						{{ item.isDirectory ? "mdi-folder" : "mdi-file" }}
					</v-icon>
					{{ item.name }}
				</div>
			</template>
			<template #item.size="{ item }">
				{{ item.isDirectory ? "" : displaySize(typeof item.size === "bigint" ? Number(item.size) : item.size) }}
			</template>
			<template #item.lastModified="{ item }">
				{{ item.lastModified ? item.lastModified.toLocaleString() : $t("generic.noValue") }}
			</template>
		</v-data-table>
	</v-card>

	<InputDialog v-model:shown="inputDialog.shown" :title="inputDialog.title" :prompt="inputDialog.prompt"
				 :preset="inputDialog.preset" @confirmed="onInputConfirmed" />

	<ConfirmDialog v-model:shown="deleteDialog.shown" :title="deleteDialog.title" :prompt="deleteDialog.prompt"
				   icon="mdi-delete" @confirmed="performDelete" />
</template>

<script setup lang="ts">
import type { FileBrowserItem, FileBrowserOptions } from "@/composables/useFileBrowser";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog.vue";
import InputDialog from "@/components/dialogs/InputDialog.vue";
import { useFileBrowser } from "@/composables/useFileBrowser";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { LogLevel, useUiStore } from "@/stores/ui";
import { displaySize } from "@/utils/display";
import { getErrorMessage } from "@/utils/errors";
import Path from "@/utils/path";

interface FileListHeader {
	title: string;
	key: string;
}

const props = defineProps<{
	options: FileBrowserOptions;
	/**
	 * Root directory the breadcrumb shows as "the volume" - clicking it jumps back to this folder
	 */
	rootDirectory: string;
	/**
	 * Display label for the root directory (e.g. "Root")
	 */
	rootLabel: string;
	/**
	 * Extra columns to add after Name, Size, Last Modified
	 */
	extraHeaders?: Array<FileListHeader>;
	noItemsText: string;
	/**
	 * Hide the "new file" toolbar button
	 */
	noNewFile?: boolean;
	/**
	 * Hide the "new directory" toolbar button
	 */
	noNewDirectory?: boolean;
	/**
	 * Hide the delete toolbar button
	 */
	noDelete?: boolean;
	/**
	 * Hide the rename toolbar button
	 */
	noRename?: boolean;
}>();

const emit = defineEmits<{
	fileClick: [item: FileBrowserItem, directory: string];
}>();

const machineStore = useMachineStore();
const uiStore = useUiStore();
const browser = useFileBrowser(props.options);

const defaultHeaders: Array<FileListHeader> = [
	{ title: "Name", key: "name" },
	{ title: "Size", key: "size" },
	{ title: "Last Modified", key: "lastModified" },
];

const effectiveHeaders = computed(() => [...defaultHeaders, ...(props.extraHeaders ?? [])]);
const internalSortBy = ref([{ key: "name", order: "asc" as const }]);

const selection = ref<Array<string>>([]);

const canGoUp = computed(() => !Path.equals(browser.directory.value, props.rootDirectory)
	&& Path.startsWith(browser.directory.value, props.rootDirectory));

// Build breadcrumb trail back to the root; each segment links to its own loadDirectory call
const breadcrumbItems = computed(() => {
	const items: Array<{ title: string; href?: string }> = [];
	const root = props.rootDirectory;
	const isAtRoot = Path.equals(browser.directory.value, root);
	items.push({ title: props.rootLabel, href: isAtRoot ? undefined : root });

	if (Path.startsWith(browser.directory.value, root)) {
		const remainder = browser.directory.value.substring(root.length).replace(/^\/+/, "");
		if (remainder.length > 0) {
			const parts = remainder.split("/");
			let accumulated = root;
			parts.forEach((part, index) => {
				accumulated = Path.combine(accumulated, part);
				const last = index === parts.length - 1;
				items.push({ title: part, href: last ? undefined : accumulated });
			});
		}
	}
	return items;
});

// Reset selection whenever the user navigates to a different directory
watch(() => browser.directory.value, () => {
	selection.value = [];
});

function onRowClick(_event: unknown, payload: { item: FileBrowserItem }) {
	const item = payload.item;
	if (item.isDirectory) {
		browser.navigateInto(item.name);
		return;
	}
	emit("fileClick", item, browser.directory.value);
}

// --- Input dialog (new file / new directory / rename) ---------------------------------------

type InputAction = "newFile" | "newDirectory" | "rename";

const inputDialog = reactive({
	shown: false,
	action: "newFile" as InputAction,
	title: "",
	prompt: "",
	preset: "",
});

function startNewFile() {
	inputDialog.action = "newFile";
	inputDialog.title = i18n.global.t("dialog.newFile.title");
	inputDialog.prompt = i18n.global.t("dialog.newFile.prompt");
	inputDialog.preset = "";
	inputDialog.shown = true;
}

function startNewDirectory() {
	inputDialog.action = "newDirectory";
	inputDialog.title = i18n.global.t("dialog.newDirectory.title");
	inputDialog.prompt = i18n.global.t("dialog.newDirectory.prompt");
	inputDialog.preset = "";
	inputDialog.shown = true;
}

function startRename() {
	if (selection.value.length !== 1) {
		return;
	}
	const current = selection.value[0];
	inputDialog.action = "rename";
	inputDialog.title = i18n.global.t("dialog.rename.title", [current]);
	inputDialog.prompt = i18n.global.t("dialog.rename.prompt");
	inputDialog.preset = current;
	inputDialog.shown = true;
}

async function onInputConfirmed(value: string | number) {
	if (typeof value !== "string") {
		return;
	}
	const name = value.trim();
	if (!name) {
		return;
	}
	const dir = browser.directory.value;
	try {
		if (inputDialog.action === "newFile") {
			await machineStore.upload({ filename: Path.combine(dir, name), content: new Blob() }, false, false);
		} else if (inputDialog.action === "newDirectory") {
			await machineStore.makeDirectory(Path.combine(dir, name));
		} else if (inputDialog.action === "rename") {
			const oldName = inputDialog.preset;
			if (name === oldName) {
				return;
			}
			await machineStore.move(Path.combine(dir, oldName), Path.combine(dir, name));
			selection.value = [];
		}
	} catch (e) {
		console.warn(e);
		uiStore.log(LogLevel.error, errorTitle(inputDialog.action, name), getErrorMessage(e));
	}
}

function errorTitle(action: InputAction, name: string): string {
	if (action === "newFile") {
		return i18n.global.t("notification.newFile.errorTitle");
	}
	if (action === "newDirectory") {
		return i18n.global.t("notification.newDirectory.errorTitle");
	}
	return i18n.global.t("notification.rename.error", [inputDialog.preset, name]);
}

// --- Delete confirmation --------------------------------------------------------------------

const deleteDialog = reactive({
	shown: false,
	title: "",
	prompt: "",
	items: [] as Array<string>,
});

function startDelete() {
	if (selection.value.length === 0) {
		return;
	}
	deleteDialog.items = [...selection.value];
	deleteDialog.title = i18n.global.t("dialog.delete.title");
	deleteDialog.prompt = deleteDialog.items.length === 1
		? i18n.global.t("dialog.delete.promptSingle", [deleteDialog.items[0]])
		: i18n.global.t("dialog.delete.promptMultiple", [deleteDialog.items.length]);
	deleteDialog.shown = true;
}

async function performDelete() {
	const items = [...deleteDialog.items];
	for (const name of items) {
		try {
			// Recursive delete for directories so non-empty ones do not surface a second prompt
			const item = browser.filelist.value.find((entry) => entry.name === name);
			const recursive = item?.isDirectory ?? false;
			await machineStore.delete(Path.combine(browser.directory.value, name), recursive);
		} catch (e) {
			console.warn(e);
			uiStore.log(LogLevel.error, i18n.global.t("notification.delete.errorTitle", [name]), getErrorMessage(e));
		}
	}
	selection.value = [];
}
</script>
