<!-- File-browser table. Toolbar shows the current path with click-to-navigate breadcrumbs and the
	 standard file actions (upload, new file, new directory, delete, rename, refresh). Multi-select
	 via the checkbox column gates delete (multi) and rename (single). Drop files onto the table to
	 upload them into the current directory. ZIP/firmware auto-extract and ZIP download still live
	 in follow-up commits -->
<template>
	<v-card ref="cardRef">
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

			<v-btn v-if="!noUpload" variant="text" icon :disabled="uiStore.uiFrozen || uploading"
				   :loading="uploading" :title="$t('button.upload.caption')" @click="pickFiles">
				<v-icon>mdi-cloud-upload</v-icon>
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

			<!-- View-mode picker. The default is "auto" (tiles on xs/sm, list on md+); the user
				 can pin a specific mode per FileList instance via useComponentSettings -->
			<v-menu>
				<template #activator="{ props: activatorProps }">
					<v-btn v-bind="activatorProps" variant="text" icon
						   :title="$t('list.fileList.viewMode')">
						<v-icon>{{ viewModeIcon }}</v-icon>
					</v-btn>
				</template>
				<v-list density="compact">
					<v-list-item v-for="opt in viewModeOptions" :key="opt.value"
								 :active="viewMode === opt.value" :prepend-icon="opt.icon"
								 :title="$t(opt.label)" @click="viewMode = opt.value" />
				</v-list>
			</v-menu>
		</v-toolbar>

		<!-- Optional progress strip for callers that fetch per-row metadata in the background
			 (e.g. JobFileList loading gcode file info one entry at a time) -->
		<slot name="progress" />

		<div :class="{ 'file-drop-target': true, 'file-drop-target--active': dragActive }"
			 @dragenter.prevent="onDragEnter" @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave"
			 @drop.prevent="onDrop">
			<!-- Tile grid: card per file with the standard nameIcon + name + size + lastModified
				 summary. Consumers can override the summary via #tileSummary to surface other
				 metadata (e.g. JobFileList shows filament + print time) -->
			<div v-if="effectiveViewMode === 'tiles'" class="tile-grid pa-2">
				<v-alert v-if="browser.filelist.value.length === 0 && !browser.loading.value"
						 type="info" variant="tonal" density="compact" class="tile-grid-empty">
					{{ $t(noItemsText) }}
				</v-alert>
				<v-card v-for="item in browser.filelist.value" :key="item.name"
						class="tile-card d-flex flex-column" variant="outlined"
						:class="{ 'tile-card--active': selection.includes(item.name) }"
						@click="onRowClick(null, { item })"
						@contextmenu="onRowContextMenu($event, item)">
					<div class="tile-card-icon d-flex align-center justify-center pt-3">
						<slot name="nameIcon" :item="item">
							<v-icon size="40">{{ item.isDirectory ? "mdi-folder" : "mdi-file" }}</v-icon>
						</slot>
					</div>
					<div class="tile-card-name text-body-2 text-center px-2 pt-2 text-truncate">
						{{ item.name }}
					</div>
					<div class="tile-card-summary text-caption text-medium-emphasis px-2 pb-2 text-center">
						<slot name="tileSummary" :item="item">
							<template v-if="!item.isDirectory">
								{{ displaySize(typeof item.size === "bigint" ? Number(item.size) : item.size) }}
							</template>
							<div v-if="item.lastModified" class="text-truncate">
								{{ item.lastModified.toLocaleString() }}
							</div>
						</slot>
					</div>
				</v-card>
			</div>

			<v-data-table v-else v-model="selection" :headers="effectiveHeaders" :items="browser.filelist.value"
						  item-value="name" :loading="browser.loading.value" :sort-by="internalSortBy" must-sort
						  hide-default-footer items-per-page="-1" density="compact" show-select
						  :row-props="rowProps" :no-data-text="$t(noItemsText)" @click:row="onRowClick">
			<template #item.name="{ item }">
				<div class="d-flex align-center">
					<!-- Default leading icon; consumers (e.g. JobFileList) override this slot to
						 render a per-row gcode thumbnail in place of the generic file icon -->
					<slot name="nameIcon" :item="item">
						<v-icon size="small" class="mr-2">
							{{ item.isDirectory ? "mdi-folder" : "mdi-file" }}
						</v-icon>
					</slot>
					{{ item.name }}
				</div>
			</template>
			<template #item.size="{ item }">
				{{ item.isDirectory ? "" : displaySize(typeof item.size === "bigint" ? Number(item.size) : item.size) }}
			</template>
			<template #item.lastModified="{ item }">
				{{ item.lastModified ? item.lastModified.toLocaleString() : $t("generic.noValue") }}
			</template>
			<!-- Forward arbitrary item slots so the caller can render rich cells (gcode metadata,
				 thumbnails, etc.) for each extra header it declared -->
			<template v-for="header in (props.extraHeaders ?? [])" :key="header.key"
					  #[`item.${header.key}`]="slotProps">
				<slot :name="`item.${header.key}`" v-bind="slotProps" />
			</template>
			</v-data-table>
		</div>
	</v-card>

	<input ref="fileInput" type="file" multiple hidden @change="onFilesPicked" />

	<v-menu v-model="contextMenu.shown" :target="[contextMenu.x, contextMenu.y]">
		<v-list density="compact">
			<v-list-item v-if="contextMenu.target && !contextMenu.target.isDirectory" @click="openFromContext">
				<template #prepend>
					<v-icon>{{ openIcon }}</v-icon>
				</template>
				<v-list-item-title>{{ openLabel }}</v-list-item-title>
			</v-list-item>
			<v-list-item v-if="contextMenu.target && contextMenu.target.isDirectory" @click="navigateFromContext">
				<template #prepend>
					<v-icon>mdi-folder-open</v-icon>
				</template>
				<v-list-item-title>{{ $t("list.fileList.open") }}</v-list-item-title>
			</v-list-item>
			<v-list-item v-if="!noDownload && hasFileInSelection" @click="startDownload">
				<template #prepend>
					<v-icon>mdi-cloud-download</v-icon>
				</template>
				<v-list-item-title>
					{{ selection.length > 1 ? $t("list.fileList.downloadZIP") : $t("list.fileList.download") }}
				</v-list-item-title>
			</v-list-item>
			<v-list-item v-if="!noRename && selection.length === 1" @click="startRename">
				<template #prepend>
					<v-icon>mdi-rename-box</v-icon>
				</template>
				<v-list-item-title>{{ $t("button.rename.caption") }}</v-list-item-title>
			</v-list-item>
			<v-list-item v-if="!noDelete && selection.length > 0" @click="startDelete">
				<template #prepend>
					<v-icon>mdi-delete</v-icon>
				</template>
				<v-list-item-title>{{ $t("button.delete.caption") }}</v-list-item-title>
			</v-list-item>
		</v-list>
	</v-menu>

	<InputDialog v-model:shown="inputDialog.shown" :title="inputDialog.title" :prompt="inputDialog.prompt"
				 :preset="inputDialog.preset" @confirmed="onInputConfirmed" />

	<ConfirmDialog v-model:shown="deleteDialog.shown" :title="deleteDialog.title" :prompt="deleteDialog.prompt"
				   icon="mdi-delete" @confirmed="performDelete" />

	<!-- Dialogs only render when this FileList owns its controller (no parent provided one).
		 When a parent (e.g. Explorer hosting multiple FileList tabs) provides a shared
		 controller via firmwareInstallControllerKey, the dialogs live there instead and this
		 FileList just dispatches uploads through the shared instance -->
	<template v-if="ownsController">
		<FirmwareUpdateDialog v-model:shown="firmwareController.firmwareDialog.shown"
							  :plan="firmwareController.firmwareDialog.plan"
							  @confirmed="firmwareController.onFirmwareUpdateConfirmed"
							  @cancelled="firmwareController.onFirmwareUpdateCancelled" />

		<ConfigUpdatedDialog v-model:shown="firmwareController.configUpdatedDialog.shown" />
	</template>
</template>

<script setup lang="ts">
import type { FileBrowserItem, FileBrowserOptions } from "@/composables/useFileBrowser";
import ConfigUpdatedDialog from "@/components/dialogs/ConfigUpdatedDialog.vue";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog.vue";
import FirmwareUpdateDialog from "@/components/dialogs/FirmwareUpdateDialog.vue";
import InputDialog from "@/components/dialogs/InputDialog.vue";
import { useFileBrowser } from "@/composables/useFileBrowser";
import {
	firmwareInstallControllerKey, useFirmwareInstallController
} from "@/composables/useFirmwareInstallController";
import { useComponentSettings } from "@/composables/useComponentSettings";
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
	/**
	 * Hide the upload toolbar button (also disables drag/drop)
	 */
	noUpload?: boolean;
	/**
	 * Hide the download / ZIP-download action
	 */
	noDownload?: boolean;
	/**
	 * Treat .zip uploads as plain files instead of extracting their contents
	 */
	noZipExtract?: boolean;
	/**
	 * Route uploads through the firmware-install pipeline: classify each file (firmware bundle,
	 * web asset, IAP/bootloader/WiFi/display binary, SBC .deb, plain config), rewrite paths to
	 * the right system directory and prompt for M997 / firmware-reset afterwards. Plugin zips
	 * are detected and forwarded to machineStore.installPlugin
	 */
	firmwareAware?: boolean;
}>();

const emit = defineEmits<{
	fileClick: [item: FileBrowserItem, directory: string];
}>();

// Two-way bind for the current directory. The parent can drive navigation by writing to the
// model (e.g. when browser back/forward changes the URL); internal navigation flows back out
// via the same model. When the parent does not provide the model, the file list falls back to
// FileBrowserOptions.initialDirectory and behaves like a standalone browser
const directoryModel = defineModel<string>("directory");

const machineStore = useMachineStore();
const uiStore = useUiStore();
const browser = useFileBrowser({
	initialDirectory: directoryModel.value ?? props.options.initialDirectory,
	decorate: props.options.decorate,
});
// Pick up an injected firmware-install controller (parent multi-FileList scenarios like the
// Explorer share one); fall back to a local one for standalone FileList consumers (Jobs page,
// any single FileList parent). `ownsController` decides whether to render the dialog pair in
// the template - only the owner does, so shared-controller scenarios end up with exactly one
// dialog instance per pipeline
const injectedController = inject(firmwareInstallControllerKey, null);
const ownsController = injectedController === null;
const firmwareController = injectedController ?? useFirmwareInstallController();

// #region View mode (list vs tiles)
type FileListViewMode = "auto" | "list" | "tiles";

const viewModeSetting = useComponentSettings<{ viewMode: FileListViewMode }>({ viewMode: "auto" });
const viewMode = computed<FileListViewMode>({
	get: () => viewModeSetting.value.viewMode,
	set: (mode) => { viewModeSetting.value = { ...viewModeSetting.value, viewMode: mode }; },
});

// `auto` resolves to tiles when the FileList's *own* container is narrow enough that the
// detailed table would overflow (around 600px / 38rem - covers the 4.3" / 7" touchscreen
// target the plan calls out). Container-width driven rather than viewport-driven so a
// FileList embedded in a narrow column (e.g. a future custom-layout tile on a desktop) still
// flips to tiles. ResizeObserver populates containerNarrow on mount and on every size change.
// cardRef binds to a v-card *component* instance; the underlying DOM element is `.$el`
const containerNarrow = ref(false);
const cardRef = ref<{ $el?: HTMLElement } | null>(null);
let cardResizeObserver: ResizeObserver | null = null;

onMounted(() => {
	const el = cardRef.value?.$el as HTMLElement | undefined;
	if (!el) return;
	cardResizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			containerNarrow.value = entry.contentRect.width < 600;
		}
	});
	cardResizeObserver.observe(el);
});

onBeforeUnmount(() => {
	cardResizeObserver?.disconnect();
	cardResizeObserver = null;
});

const effectiveViewMode = computed<"list" | "tiles">(() => {
	if (viewMode.value === "tiles") return "tiles";
	if (viewMode.value === "list") return "list";
	return containerNarrow.value ? "tiles" : "list";
});

const viewModeIcon = computed(() => {
	if (viewMode.value === "tiles") return "mdi-view-grid";
	if (viewMode.value === "list") return "mdi-format-list-bulleted";
	return "mdi-view-dashboard-variant";
});

const viewModeOptions: Array<{ value: FileListViewMode; icon: string; label: string }> = [
	{ value: "auto", icon: "mdi-view-dashboard-variant", label: "list.fileList.viewModeAuto" },
	{ value: "list", icon: "mdi-format-list-bulleted", label: "list.fileList.viewModeList" },
	{ value: "tiles", icon: "mdi-view-grid", label: "list.fileList.viewModeTiles" },
];

// Translated at read time so locale switches re-render the header row without remount
const defaultHeaders = computed<Array<FileListHeader>>(() => [
	{ title: i18n.global.t("list.baseFileList.fileName"), key: "name" },
	{ title: i18n.global.t("list.baseFileList.size"), key: "size" },
	{ title: i18n.global.t("list.baseFileList.lastModified"), key: "lastModified" },
]);

const effectiveHeaders = computed(() => [...defaultHeaders.value, ...(props.extraHeaders ?? [])]);
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

// Internal -> external: reset selection on any directory change and push the new directory up
// through the model. The equality guard keeps the parent's reactive proxy from flagging a
// no-op write as a change. `immediate` covers the initial mount, when the parent might have
// passed an undefined model and the browser settled on options.initialDirectory - the parent
// still needs to learn that landing spot
watch(() => browser.directory.value, (newDir) => {
	selection.value = [];
	if (directoryModel.value !== newDir) {
		directoryModel.value = newDir;
	}
}, { immediate: true });

// External -> internal: when the parent writes a new directory (browser back / deep link),
// drive the file browser to load it. Skip when the values already match - this happens after
// the watcher above already echoed an internal navigation back through the model
watch(directoryModel, (newDir) => {
	if (newDir !== undefined && newDir !== browser.directory.value) {
		browser.loadDirectory(newDir);
	}
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

// --- Upload ----------------------------------------------------------------------------------

const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const dragActive = ref(false);
let dragDepth = 0;

function pickFiles() {
	if (uploading.value) {
		return;
	}
	fileInput.value?.click();
}

async function onFilesPicked(e: Event) {
	const target = e.target as HTMLInputElement;
	const files = target.files;
	if (!files || files.length === 0) {
		return;
	}
	try {
		await uploadFiles(Array.from(files));
	} finally {
		target.value = "";
	}
}

async function uploadFiles(files: Array<File>) {
	if (props.noUpload || files.length === 0) {
		return;
	}
	uploading.value = true;
	try {
		if (props.firmwareAware) {
			await runFirmwareUpload(files);
		} else {
			await runPlainUpload(files);
		}
	} catch (e) {
		console.warn(e);
		uiStore.log(LogLevel.error, i18n.global.t("notification.decompress.errorTitle"), getErrorMessage(e));
	} finally {
		uploading.value = false;
	}
}

async function runPlainUpload(files: Array<File>) {
	const dir = browser.directory.value;
	const payload: Array<{ filename: string; content: Blob | File }> = [];

	for (const file of files) {
		if (/\.zip$/i.test(file.name) && !props.noZipExtract) {
			const extracted = await extractZip(file, dir);
			payload.push(...extracted);
		} else {
			payload.push({ filename: Path.combine(dir, file.name), content: file });
		}
	}

	if (payload.length > 0) {
		await machineStore.upload(payload);
	}
}

// Delegate to the firmware-install controller (shared via inject when a parent provides it,
// otherwise the local one this FileList instantiated). The controller owns the plan, the
// post-upload dialog flow and the M997 sequencing
async function runFirmwareUpload(files: Array<File>) {
	await firmwareController.runFirmwareUpload(files);
}

async function extractZip(zip: File, dir: string): Promise<Array<{ filename: string; content: Blob }>> {
	const { default: JSZip } = await import("jszip");
	const archive = await JSZip.loadAsync(zip);
	const entries: Array<{ filename: string; content: Blob }> = [];
	const promises: Array<Promise<void>> = [];
	archive.forEach((relativePath, entry) => {
		if (entry.dir) {
			return;
		}
		promises.push((async () => {
			const blob = await entry.async("blob");
			entries.push({ filename: Path.combine(dir, relativePath), content: blob });
		})());
	});
	await Promise.all(promises);
	return entries;
}

// Drag/drop counts enter/leave to keep the active highlight stable across child elements that
// would otherwise fire spurious dragleave events
function onDragEnter(event: DragEvent) {
	if (props.noUpload || !hasFiles(event)) {
		return;
	}
	dragDepth += 1;
	dragActive.value = true;
}

function onDragOver(event: DragEvent) {
	if (props.noUpload || !hasFiles(event)) {
		return;
	}
	if (event.dataTransfer) {
		event.dataTransfer.dropEffect = "copy";
	}
}

function onDragLeave() {
	if (props.noUpload) {
		return;
	}
	dragDepth = Math.max(0, dragDepth - 1);
	if (dragDepth === 0) {
		dragActive.value = false;
	}
}

async function onDrop(event: DragEvent) {
	dragDepth = 0;
	dragActive.value = false;
	if (props.noUpload || !event.dataTransfer || event.dataTransfer.files.length === 0) {
		return;
	}
	await uploadFiles(Array.from(event.dataTransfer.files));
}

function hasFiles(event: DragEvent): boolean {
	const types = event.dataTransfer?.types;
	return !!types && Array.from(types).includes("Files");
}

// --- Context menu + download ----------------------------------------------------------------

const contextMenu = reactive({
	shown: false,
	x: 0,
	y: 0,
	target: null as FileBrowserItem | null,
});

const hasFileInSelection = computed(() => browser.filelist.value
	.some((entry) => selection.value.includes(entry.name) && !entry.isDirectory));

// Macros run via M98 instead of an editor, so the open icon reflects that when we're in a
// macros directory. Anywhere else, plain "open in editor"
const inMacrosDirectory = computed(() => Path.startsWith(browser.directory.value,
	machineStore.model.directories.macros));
const openIcon = computed(() => inMacrosDirectory.value ? "mdi-play" : "mdi-open-in-new");
const openLabel = computed(() => inMacrosDirectory.value
	? i18n.global.t("list.macro.run")
	: i18n.global.t("list.fileList.open"));

function rowProps({ item }: { item: FileBrowserItem }) {
	return {
		onContextmenu: (event: MouseEvent) => onRowContextMenu(event, item),
	};
}

function onRowContextMenu(event: MouseEvent, item: FileBrowserItem) {
	event.preventDefault();
	event.stopPropagation();

	// Auto-select the right-clicked row unless the user explicitly multi-selected first
	if (!selection.value.includes(item.name)) {
		selection.value = [item.name];
	}

	contextMenu.target = item;
	contextMenu.x = event.clientX;
	contextMenu.y = event.clientY;
	contextMenu.shown = false;
	nextTick(() => {
		contextMenu.shown = true;
	});
}

function openFromContext() {
	contextMenu.shown = false;
	const target = contextMenu.target;
	if (!target || target.isDirectory) {
		return;
	}
	emit("fileClick", target, browser.directory.value);
}

function navigateFromContext() {
	contextMenu.shown = false;
	const target = contextMenu.target;
	if (!target || !target.isDirectory) {
		return;
	}
	browser.navigateInto(target.name);
}

async function startDownload() {
	contextMenu.shown = false;
	const items = browser.filelist.value.filter((entry) => selection.value.includes(entry.name));
	const files = items.filter((entry) => !entry.isDirectory);
	if (files.length === 0) {
		return;
	}

	const dir = browser.directory.value;
	try {
		if (files.length === 1) {
			const file = files[0];
			const blob = await machineStore.download({ filename: Path.combine(dir, file.name), type: "blob" });
			saveBlob(file.name, blob);
		} else {
			await downloadZip(dir, files.map((file) => file.name));
		}
	} catch (e) {
		console.warn(e);
		uiStore.log(LogLevel.error,
			i18n.global.t("notification.fileTransfer.download.error", [files[0]?.name ?? ""]),
			getErrorMessage(e));
	}
}

async function downloadZip(dir: string, names: Array<string>) {
	const { default: JSZip } = await import("jszip");
	const zip = new JSZip();
	for (const name of names) {
		const blob = await machineStore.download({ filename: Path.combine(dir, name), type: "blob" }, false);
		zip.file(name, blob);
	}
	const archive = await zip.generateAsync({ type: "blob" });
	saveBlob("files.zip", archive);
}

function saveBlob(filename: string, blob: Blob) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

// #endregion
</script>

<style scoped>
.file-drop-target {
	position: relative;
	container-type: inline-size;
}

.file-drop-target--active::after {
	content: "";
	position: absolute;
	inset: 0;
	border: 2px dashed rgb(var(--v-theme-primary));
	background-color: rgba(var(--v-theme-primary), 0.06);
	pointer-events: none;
}

/* Tile grid: auto-fills with cards sized to comfortably hold a 48px thumbnail + name + summary
   on phone-sized screens, expanding to wider cards on tablet/desktop */
.tile-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 8px;
}

.tile-grid-empty {
	grid-column: 1 / -1;
}

.tile-card {
	cursor: pointer;
	min-height: 140px;
}

.tile-card--active {
	border-color: rgb(var(--v-theme-primary)) !important;
}

.tile-card-name {
	font-weight: 500;
}
</style>
