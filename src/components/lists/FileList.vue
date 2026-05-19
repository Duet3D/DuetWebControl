<template>
	<v-card ref="cardRef" :class="['file-list-card', 'd-flex', 'flex-column', { 'file-list-card--empty': shouldShrink }]">
		<v-toolbar density="compact" color="surface" class="px-2 flex-shrink-0">
			<v-btn icon variant="text" :disabled="!canGoUp" :title="$t('list.baseFileList.goUp')"
				   @dragover="onParentDragOver($event, parentDirectory)"
				   @dragleave="onParentDragLeave"
				   @drop="onParentDrop($event, parentDirectory)"
				   @click="browser.goUp()">
				<v-icon>mdi-arrow-up</v-icon>
			</v-btn>

			<v-breadcrumbs :items="breadcrumbItems" density="compact" class="pa-0 file-list-breadcrumbs">
				<template #divider>
					<v-icon>mdi-chevron-right</v-icon>
				</template>
				<template #item="{ item }">
					<a v-if="item.href" href="javascript:void(0)" class="text-body-medium text-no-wrap"
					   @dragover="onParentDragOver($event, item.href)"
					   @dragleave="onParentDragLeave"
					   @drop="onParentDrop($event, item.href)"
					   @click.prevent="browser.loadDirectory(item.href)">
						{{ item.title }}
					</a>
					<span v-else class="text-body-medium text-no-wrap">{{ item.title }}</span>
				</template>
			</v-breadcrumbs>

			<v-spacer />

			<slot name="actions" />

			<!-- Volume picker / other upload-row inserts always stay visible, even when the rest
				 of the toolbar collapses into the "..." menu - they're contextual selectors -->
			<slot name="upload-prepend" />

			<template v-if="!collapseToolbar">
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

				<v-menu v-if="!noViewMode">
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

				<v-btn variant="text" icon :loading="browser.loading.value" :disabled="uiStore.uiFrozen"
					   :title="$t('button.refresh.caption')" @click="onRefreshClicked">
					<v-icon>mdi-refresh</v-icon>
				</v-btn>
			</template>

			<v-menu v-else>
				<template #activator="{ props: activatorProps }">
					<v-btn v-bind="activatorProps" variant="text" icon :disabled="uiStore.uiFrozen"
						   :loading="uploading || browser.loading.value"
						   :title="$t('list.fileList.moreActions')">
						<v-icon>mdi-dots-vertical</v-icon>
					</v-btn>
				</template>
				<v-list density="compact">
					<v-list-item v-if="!noRename && selection.length === 1"
								 prepend-icon="mdi-rename-box" :title="$t('button.rename.caption')"
								 :disabled="uiStore.uiFrozen" @click="startRename" />
					<v-list-item v-if="!noDelete && selection.length > 0"
								 prepend-icon="mdi-delete" :title="$t('button.delete.caption')"
								 :disabled="uiStore.uiFrozen" @click="startDelete" />
					<v-list-item v-if="!noUpload" prepend-icon="mdi-cloud-upload"
								 :title="$t('button.upload.caption')"
								 :disabled="uiStore.uiFrozen || uploading" @click="pickFiles" />
					<v-list-item v-if="!noNewFile" prepend-icon="mdi-file-plus"
								 :title="$t('button.newFile.caption')"
								 :disabled="uiStore.uiFrozen" @click="startNewFile" />
					<v-list-item v-if="!noNewDirectory" prepend-icon="mdi-folder-plus"
								 :title="$t('button.newDirectory.caption')"
								 :disabled="uiStore.uiFrozen" @click="startNewDirectory" />
					<v-divider v-if="!noViewMode" />
					<v-list-item v-if="!noViewMode" v-for="opt in viewModeOptions" :key="opt.value"
								 :prepend-icon="opt.icon" :title="$t(opt.label)"
								 :active="viewMode === opt.value" @click="viewMode = opt.value" />
					<v-divider />
					<v-list-item prepend-icon="mdi-refresh" :title="$t('button.refresh.caption')"
								 :disabled="uiStore.uiFrozen" @click="onRefreshClicked" />
				</v-list>
			</v-menu>
		</v-toolbar>

		<slot name="progress" />

		<div :class="{ 'file-drop-target': true, 'file-drop-target--active': dragActive, 'file-list-body': true }"
			 @dragenter.prevent="onDragEnter" @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave"
			 @drop.prevent="onDrop">
			<v-pull-to-refresh :disabled="!mobile" @load="onPullRefresh">
			<div v-if="effectiveViewMode === 'tiles'" class="tile-grid pa-2">
				<v-alert v-if="browser.filelist.value.length === 0 && !browser.loading.value"
						 type="info" variant="tonal" density="compact" class="tile-grid-empty">
					{{ $t(noItemsText) }}
				</v-alert>
				<v-card v-for="item in browser.filelist.value" :key="item.name"
						class="tile-card d-flex flex-column" variant="flat" rounded="lg"
						:class="{ 'tile-card--active': selection.includes(item.name) }"
						@click="onRowClick(null, { item })"
						@contextmenu="onRowContextMenu($event, item)">
					<div class="tile-card-icon d-flex align-center justify-center pt-3">
						<slot name="nameIcon" :item="item" :tile="true">
							<v-icon size="64">{{ item.isDirectory ? "mdi-folder" : "mdi-file" }}</v-icon>
						</slot>
					</div>
					<div class="tile-card-name text-body-medium text-center px-2 pt-2 text-truncate">
						{{ item.name }}
					</div>
					<div class="tile-card-summary text-body-small text-medium-emphasis px-2 pb-2 text-center">
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

			<v-alert v-else-if="browser.filelist.value.length === 0 && !browser.loading.value"
					 :type="emptyAlertType" :text="$t(emptyAlertText)" tile density="compact"
					 class="ma-0 text-left" />

			<v-data-table v-else v-model="selection" v-model:sort-by="internalSortBy"
						  :headers="effectiveHeaders" :items="browser.filelist.value"
						  item-value="name" :loading="browser.loading.value" must-sort
						  hide-default-footer items-per-page="-1" :density="tableDensity" show-select hover
						  loading-text="list.fileList.loading"
						  :row-props="rowProps" @click:row="onRowClick">
			<template #item.name="{ item }">
				<div class="d-flex align-center">
					<slot name="nameIcon" :item="item">
						<v-icon size="small" class="mr-2">
							{{ item.isDirectory ? "mdi-folder" : "mdi-file" }}
						</v-icon>
					</slot>
					<span>{{ item.name }}</span>
					<v-chip v-if="isConfigToolEligible(item)" size="x-small" class="ms-2"
							color="primary" variant="tonal" @click.stop="openInConfigTool">
						<v-icon size="x-small" start>mdi-open-in-new</v-icon>
						{{ $t("list.system.configToolNote") }}
					</v-chip>
				</div>
			</template>
			<template #item.size="{ item }">
				{{ item.isDirectory ? "" : displaySize(typeof item.size === "bigint" ? Number(item.size) : item.size) }}
			</template>
			<template #item.lastModified="{ item }">
				{{ item.lastModified ? item.lastModified.toLocaleString() : $t("generic.noValue") }}
			</template>
			<template v-for="header in (props.extraHeaders ?? [])" :key="header.key"
					  #[`item.${header.key}`]="slotProps">
				<slot :name="`item.${header.key}`" v-bind="slotProps" />
			</template>
			</v-data-table>
			</v-pull-to-refresh>
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
			<v-list-item v-if="contextMenu.target && !contextMenu.target.isDirectory && fileMode === 'jobs'"
						 @click="simulateFromContext">
				<template #prepend>
					<v-icon>mdi-flask</v-icon>
				</template>
				<v-list-item-title>{{ $t("list.jobs.simulate") }}</v-list-item-title>
			</v-list-item>
			<v-list-item v-if="contextMenu.target && !contextMenu.target.isDirectory"
						 @click="editFromContext">
				<template #prepend>
					<v-icon>mdi-file-document-edit</v-icon>
				</template>
				<v-list-item-title>{{ $t("list.fileList.edit") }}</v-list-item-title>
			</v-list-item>
			<v-list-item v-if="canRunAsMacro" @click="runMacroFromContext">
				<template #prepend>
					<v-icon>mdi-play</v-icon>
				</template>
				<v-list-item-title>{{ $t("list.fileList.runMacro") }}</v-list-item-title>
			</v-list-item>
			<v-list-item v-for="(item, idx) in pluginContextMenuItems" :key="`plugin-${idx}`"
						 @click="onPluginContextMenuItem(item)">
				<template #prepend>
					<v-icon>{{ item.icon }}</v-icon>
				</template>
				<v-list-item-title>{{ pluginItemLabel(item) }}</v-list-item-title>
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

	<template v-if="ownsController">
		<FirmwareUpdateDialog v-model:shown="firmwareController.firmwareDialog.shown"
							  :plan="firmwareController.firmwareDialog.plan"
							  @confirmed="firmwareController.onFirmwareUpdateConfirmed"
							  @cancelled="firmwareController.onFirmwareUpdateCancelled" />

		<ConfigUpdatedDialog v-model:shown="firmwareController.configUpdatedDialog.shown" />
	</template>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";
import { VPullToRefresh } from "vuetify/labs/VPullToRefresh";

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
import { ContextMenuType, LogLevel, useUiStore } from "@/stores/ui";
import { displaySize } from "@/utils/display";
import { getErrorMessage } from "@/utils/errors";
import Events from "@/utils/events";
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
	/**
	 * Suppress the list/tiles view-mode toggle and force the list view. Used by consumers (e.g.
	 * the Explorer) where the tiles layout doesn't carry useful extra information
	 */
	noViewMode?: boolean;
	/**
	 * Semantic mode used to label the primary action. "macros" runs via M98, "jobs" prints via M32,
	 * "files" opens in the editor. Also toggles the Simulate context-menu entry (jobs only)
	 */
	mode?: "files" | "macros" | "jobs";
}>();

const fileMode = computed(() => props.mode ?? "files");

const emit = defineEmits<{
	fileClick: [item: FileBrowserItem, directory: string];
	fileEdit: [item: FileBrowserItem, directory: string];
	fileRunMacro: [item: FileBrowserItem, directory: string];
	fileSimulate: [item: FileBrowserItem, directory: string];
	refresh: [directory: string];
}>();

function onRefreshClicked() {
	emit("refresh", browser.directory.value);
	return browser.refresh();
}

// Touch-only pull-to-refresh: same refresh path as the toolbar button (emits + calls
// browser.refresh), gated to the mobile breakpoint so mouse-drag doesn't trigger it on desktop
async function onPullRefresh({ done }: { done: () => void }) {
	try {
		await onRefreshClicked();
	} finally {
		done();
	}
}

// Two-way bind for the current directory. The parent can drive navigation by writing to the
// model (e.g. when browser back/forward changes the URL); internal navigation flows back out
// via the same model. When the parent does not provide the model, the file list falls back to
// FileBrowserOptions.initialDirectory and behaves like a standalone browser
const directoryModel = defineModel<string>("directory");

const machineStore = useMachineStore();
const uiStore = useUiStore();
const router = useRouter();
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
// flips to tiles. ResizeObserver populates containerNarrow on mount and on every size change
// cardRef binds to a v-card *component* instance; the underlying DOM element is `.$el`
const containerNarrow = ref(false);
const cardRef = ref<{ $el?: HTMLElement } | null>(null);
let cardResizeObserver: ResizeObserver | null = null;

onMounted(() => {
	const el = cardRef.value?.$el as HTMLElement | undefined;
	if (!el) {
		return;
	}
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
	if (props.noViewMode) {
		return "list";
	}
	if (viewMode.value === "tiles") {
		return "tiles";
	}
	if (viewMode.value === "list") {
		return "list";
	}
	// Auto: tiles on xs/sm touch viewports regardless of container width, otherwise fall back
	// to the container-width check (covers FileLists embedded in a narrow desktop column)
	return mobile.value || containerNarrow.value ? "tiles" : "list";
});

// Bigger tap targets at xs/sm. Compact rows are fine for mouse-driven md+ desktops, but on
// touch the smaller hit area is frustrating - default density nearly doubles row height
const { mdAndUp, smAndDown, mobile } = useDisplay();
// At sm and below the toolbar runs out of room - rename/delete/upload/new/refresh/view-mode
// would push the breadcrumb off-screen. Collapse them into a single "..." menu instead
const collapseToolbar = computed(() => smAndDown.value);
const tableDensity = computed<"default" | "comfortable" | "compact">(
	() => mdAndUp.value ? "compact" : "default"
);

const viewModeIcon = computed(() => {
	if (viewMode.value === "tiles") {
		return "mdi-view-grid";
	}
	if (viewMode.value === "list") {
		return "mdi-format-list-bulleted";
	}
	return "mdi-view-dashboard-variant";
});

const viewModeOptions: Array<{ value: FileListViewMode; icon: string; label: string }> = [
	{ value: "auto", icon: "mdi-view-dashboard-variant", label: "list.fileList.viewModeAuto" },
	{ value: "list", icon: "mdi-format-list-bulleted", label: "list.fileList.viewModeList" },
	{ value: "tiles", icon: "mdi-view-grid", label: "list.fileList.viewModeTiles" },
];

// Translated at read time so locale switches re-render the header row without remount
// Last-modified disappears at xs - the column wastes a third of the row at narrow widths and
// the timestamp doesn't really inform a file pick on a phone
const { xs: isXs } = useDisplay();
const defaultHeaders = computed<Array<FileListHeader>>(() => {
	const headers: Array<FileListHeader> = [
		{ title: i18n.global.t("list.baseFileList.fileName"), key: "name" },
		{ title: i18n.global.t("list.baseFileList.size"), key: "size" },
	];
	if (!isXs.value) {
		headers.push({ title: i18n.global.t("list.baseFileList.lastModified"), key: "lastModified" });
	}
	return headers;
});

const effectiveHeaders = computed(() => [...defaultHeaders.value, ...(props.extraHeaders ?? [])]);

// v-data-table sorts purely by the active column - left to itself it interleaves files and
// directories alphabetically. Force `isDirectory` (boolean, desc => true-first) as the primary
// key so dirs always cluster at the top, then keep the user's column choice as the secondary
// key. The watcher below re-prepends isDirectory after every header click since v-data-table
// replaces the whole sort-by array
const internalSortBy = ref<Array<{ key: string; order: "asc" | "desc" }>>([
	{ key: "isDirectory", order: "desc" },
	{ key: "name", order: "asc" },
]);
watch(internalSortBy, (value) => {
	if (!value.length || value[0].key !== "isDirectory") {
		// User clicked a column header - put isDirectory back at the front while preserving the
		// user-chosen sort as the secondary key
		const userSort = value.filter(s => s.key !== "isDirectory");
		internalSortBy.value = [{ key: "isDirectory", order: "desc" }, ...userSort];
	}
});

const selection = ref<Array<string>>([]);

const canGoUp = computed(() => !Path.equals(browser.directory.value, props.rootDirectory)
	&& Path.startsWith(browser.directory.value, props.rootDirectory));

// Parent of the current directory, scoped by the FileList's rootDirectory so the up-arrow
// drop target can't walk past it
const parentDirectory = computed(() => {
	if (!canGoUp.value) {
		return browser.directory.value;
	}
	const stripped = browser.directory.value.replace(/\/+$/, "");
	const lastSlash = stripped.lastIndexOf("/");
	if (lastSlash <= 0) {
		return browser.directory.value;
	}
	const parent = stripped.slice(0, lastSlash);
	return Path.startsWith(parent, props.rootDirectory) ? parent : props.rootDirectory;
});

// Pick the no-data alert variant + text based on the last load result - "the directory just
// happens to be empty" reads very differently from "the directory doesn't exist on the SD card"
// and from "the connector returned an error we don't know how to render specifically"
const emptyAlertType = computed(() => browser.errorReason.value === "missing" ? "warning" : (browser.errorReason.value === "error" ? "error" : "info"));
const emptyAlertText = computed(() => {
	switch (browser.errorReason.value) {
		case "missing": return "list.fileList.directoryNotFound";
		case "error": return "list.fileList.loadFailed";
		default: return props.noItemsText;
	}
});

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

// #endregion

// #region Input dialog (new file / new directory / rename)

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

// #endregion

// #region Delete confirmation

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
			uiStore.notifyError(e, i18n.global.t("notification.delete.errorTitle", [name]));
		}
	}
	selection.value = [];
}

// #endregion

// #region Upload

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
		uiStore.notifyError(e, i18n.global.t("notification.decompress.errorTitle"));
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

// #endregion

// #region Context menu + download

const contextMenu = reactive({
	shown: false,
	x: 0,
	y: 0,
	target: null as FileBrowserItem | null,
});

const hasFileInSelection = computed(() => browser.filelist.value
	.some((entry) => selection.value.includes(entry.name) && !entry.isDirectory));

// When the list has nothing to show (and isn't loading), drop the card's height: 100% so the
// panel collapses to toolbar + alert instead of stretching the empty-state strip to the
// dashboard's tallest sibling
const isListEmpty = computed(() => browser.filelist.value.length === 0 && !browser.loading.value);

// Only shrink while the machine is disconnected (lets the empty splash collapse cleanly). Once
// connected, the panel keeps its full-height layout for the rest of the session so navigating
// into an empty subdirectory doesn't jitter the size
const shouldShrink = computed(() => isListEmpty.value && !machineStore.isConnected);

// Primary-action icon / label match the mode prop: macros run via M98 (Run), jobs print via
// M32 (Print), everything else opens in the editor (Open)
const openIcon = computed(() => {
	switch (fileMode.value) {
		case "macros": return "mdi-play";
		case "jobs":   return "mdi-printer";
		default:       return "mdi-open-in-new";
	}
});
const openLabel = computed(() => {
	switch (fileMode.value) {
		case "macros": return i18n.global.t("list.macro.run");
		case "jobs":   return i18n.global.t("list.jobs.print");
		default:       return i18n.global.t("list.fileList.open");
	}
});

function rowProps({ item }: { item: FileBrowserItem }) {
	return {
		draggable: true,
		onContextmenu: (event: MouseEvent) => onRowContextMenu(event, item),
		onDragstart: (event: DragEvent) => onRowDragStart(event, item),
		onDragover: (event: DragEvent) => onRowDragOver(event, item),
		onDragleave: (event: DragEvent) => onRowDragLeave(event, item),
		onDrop: (event: DragEvent) => onRowDrop(event, item),
		"data-droptarget": item.isDirectory ? "true" : null,
	};
}

// #region Row drag-and-drop (move between directories)
// Source rows carry the source directory + the full selection so the user can drag a single
// row OR a multi-select. Drop targets are directory rows in the same FileList, which trigger
// a sequential `machineStore.move` per item (force=false; conflicts surface as warnings)
const ROW_DRAG_TYPE = "dwcFiles";

interface RowDragPayload {
	type: typeof ROW_DRAG_TYPE;
	directory: string;
	names: Array<string>;
}

function onRowDragStart(event: DragEvent, item: FileBrowserItem) {
	if (!event.dataTransfer || contextMenu.shown) {
		event.preventDefault();
		return;
	}
	// If the dragged row isn't part of the selection, treat it as a single-item drag instead of
	// silently moving the unrelated current selection
	const names = selection.value.includes(item.name) ? [...selection.value] : [item.name];
	const payload: RowDragPayload = {
		type: ROW_DRAG_TYPE,
		directory: browser.directory.value,
		names,
	};
	event.dataTransfer.setData("application/json", JSON.stringify(payload));
	event.dataTransfer.effectAllowed = "move";
}

function readRowDragPayload(event: DragEvent): RowDragPayload | null {
	if (!event.dataTransfer) {
		return null;
	}
	const raw = event.dataTransfer.getData("application/json");
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw);
		if (parsed && parsed.type === ROW_DRAG_TYPE && typeof parsed.directory === "string"
			&& Array.isArray(parsed.names)) {
			return parsed as RowDragPayload;
		}
	} catch { /* not our payload */ }
	return null;
}

function isValidRowDrop(payload: RowDragPayload, target: FileBrowserItem): boolean {
	if (!target.isDirectory) {
		return false;
	}
	// Disallow dropping into a folder you're also dragging (would create a no-op or recursion)
	if (payload.directory === browser.directory.value && payload.names.includes(target.name)) {
		return false;
	}
	return true;
}

function onRowDragOver(event: DragEvent, target: FileBrowserItem) {
	if (!target.isDirectory || !event.dataTransfer) {
		return;
	}
	// We can't read dataTransfer payloads during dragover for security reasons in most browsers
	// (only `types` is available); accept the drop optimistically when the type matches and let
	// the drop handler do the real validation
	if (!Array.from(event.dataTransfer.types).includes("application/json")) {
		return;
	}
	event.preventDefault();
	event.dataTransfer.dropEffect = "move";
	(event.currentTarget as HTMLElement | null)?.classList.add("file-row--drop-target");
}

function onRowDragLeave(_event: DragEvent, target: FileBrowserItem) {
	if (!target.isDirectory) {
		return;
	}
	(_event.currentTarget as HTMLElement | null)?.classList.remove("file-row--drop-target");
}

async function onRowDrop(event: DragEvent, target: FileBrowserItem) {
	(event.currentTarget as HTMLElement | null)?.classList.remove("file-row--drop-target");
	if (!target.isDirectory) {
		return;
	}
	const payload = readRowDragPayload(event);
	if (!payload || !isValidRowDrop(payload, target)) {
		return;
	}
	event.preventDefault();
	event.stopPropagation();

	const targetDir = Path.combine(browser.directory.value, target.name);
	await moveDraggedItems(payload, targetDir);
}

// Drop handlers for the parent-navigation targets (up-arrow + breadcrumb entries). They share
// the row payload format so a row drag can land on either a sibling folder or any ancestor
function onParentDragOver(event: DragEvent, targetDir: string) {
	if (!event.dataTransfer || !targetDir) {
		return;
	}
	if (!Array.from(event.dataTransfer.types).includes("application/json")) {
		return;
	}
	// Reject dropping into the same directory we're already viewing - it's a no-op
	if (Path.equals(targetDir, browser.directory.value)) {
		return;
	}
	event.preventDefault();
	event.dataTransfer.dropEffect = "move";
	(event.currentTarget as HTMLElement | null)?.classList.add("file-row--drop-target");
}

function onParentDragLeave(event: DragEvent) {
	(event.currentTarget as HTMLElement | null)?.classList.remove("file-row--drop-target");
}

async function onParentDrop(event: DragEvent, targetDir: string) {
	(event.currentTarget as HTMLElement | null)?.classList.remove("file-row--drop-target");
	if (!targetDir || Path.equals(targetDir, browser.directory.value)) {
		return;
	}
	const payload = readRowDragPayload(event);
	if (!payload) {
		return;
	}
	event.preventDefault();
	event.stopPropagation();
	await moveDraggedItems(payload, targetDir);
}

async function moveDraggedItems(payload: RowDragPayload, targetDir: string) {
	const targetLabel = targetDir.split("/").filter(Boolean).pop() ?? targetDir;
	let moved = 0;
	for (const name of payload.names) {
		const from = Path.combine(payload.directory, name);
		const to = Path.combine(targetDir, name);
		try {
			await machineStore.move(from, to);
			moved += 1;
		} catch (e) {
			uiStore.notifyError(e, i18n.global.t("list.fileList.moveError", [name, targetLabel]));
			break;
		}
	}
	await browser.refresh();
	selection.value = [];
	if (moved > 0) {
		const message = moved === 1
			? i18n.global.t("list.fileList.movedOne", [payload.names[0], targetLabel])
			: i18n.global.t("list.fileList.movedMany", [moved, targetLabel]);
		uiStore.log(LogLevel.success, message);
	}
}
// #endregion

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

function editFromContext() {
	contextMenu.shown = false;
	const target = contextMenu.target;
	if (!target || target.isDirectory) {
		return;
	}
	emit("fileEdit", target, browser.directory.value);
}

function simulateFromContext() {
	contextMenu.shown = false;
	const target = contextMenu.target;
	if (!target || target.isDirectory) {
		return;
	}
	emit("fileSimulate", target, browser.directory.value);
}

function runMacroFromContext() {
	contextMenu.shown = false;
	const target = contextMenu.target;
	if (!target || target.isDirectory) {
		return;
	}
	emit("fileRunMacro", target, browser.directory.value);
}

// Run Macro is offered inside the system tree on files whose name ends in a runnable
// gcode/macro extension (with an optional .bak suffix). /macros runs on click and /gcodes
// prompts to start the job, so neither needs the extra entry
const RUN_MACRO_FILE_RE = /(\.g|\.gcode|\.gc|\.gco|\.nc|\.ngc|\.tap)(\.bak)?$/i;
const canRunAsMacro = computed(() => {
	const target = contextMenu.target;
	if (!target || target.isDirectory) {
		return false;
	}
	if (!Path.startsWith(browser.directory.value, machineStore.model.directories.system)) {
		return false;
	}
	return RUN_MACRO_FILE_RE.test(target.name);
});

// #region Config Tool chip
// Show an "edit via config tool" chip next to /sys/config.json. Clicking it POSTs the JSON
// template to the public RepRapFirmware configuration tool in a new tab
function isConfigToolEligible(item: FileBrowserItem): boolean {
	if (item.isDirectory || item.name !== "config.json") {
		return false;
	}
	return browser.directory.value === machineStore.model.directories.system;
}

async function openInConfigTool() {
	try {
		const filename = Path.combine(machineStore.model.directories.system, "config.json");
		const jsonTemplate = await machineStore.download(
			{ filename, type: "text" }, false, false, false
		) as string;

		const form = document.createElement("form");
		form.method = "POST";
		form.action = "https://configtool.reprapfirmware.org/load.php";
		form.target = "_blank";
		const textarea = document.createElement("textarea");
		textarea.name = "json";
		textarea.value = jsonTemplate;
		form.appendChild(textarea);
		document.body.appendChild(form);
		try {
			form.submit();
		} finally {
			document.body.removeChild(form);
		}
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("list.system.configToolError"));
	}
}
// #endregion

// #region Plugin-registered context menu items
// Surface entries plugins added via registerPluginContextMenuItem. Limited to the JobFileList
// type for now since that's the only ContextMenuType we expose, and it only makes sense for
// rows that represent files (not directories)
const pluginContextMenuItems = computed(() => {
	if (fileMode.value !== "jobs") {
		return [];
	}
	if (!contextMenu.target || contextMenu.target.isDirectory) {
		return [];
	}
	return uiStore.contextMenuItems[ContextMenuType.JobFileList] ?? [];
});

function pluginItemLabel(item: { name: string | (() => string) }): string {
	return typeof item.name === "function" ? item.name() : item.name;
}

async function onPluginContextMenuItem(item: { path?: string; action: string }) {
	const target = contextMenu.target;
	contextMenu.shown = false;
	if (!target || target.isDirectory) {
		return;
	}
	const fullPath = Path.combine(browser.directory.value, target.name);
	if (item.path) {
		// Pass the file via query so the destination page can pick it up on mount even before
		// the lazy chunk has finished loading and registered its global event listener
		await router.push({ path: item.path, query: { file: fullPath } });
	}
	// Plugin context-menu items carry a free-form action name (e.g. GCodeViewer's
	// `view-3d-model`); the typed event channel doesn't know about plugin-extended keys, so cast
	// at this boundary
	Events.emit(item.action as Parameters<typeof Events.emit>[0], fullPath);
}
// #endregion

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
		uiStore.notifyError(e, i18n.global.t("notification.fileTransfer.download.error", [files[0]?.name ?? ""]));
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
.file-list-card {
	height: 100%;
}

/* Long breadcrumb paths stay on a single row and scroll horizontally instead of wrapping -
   v-toolbar has a fixed height, so a wrapped breadcrumb would just clip the extra rows.
   `text-no-wrap` on the items prevents text-internal wraps that would otherwise leave
   subsequent items mid-air to the right when a long folder name breaks across two lines.
   Hide the scrollbar visually so it doesn't add row height and break the toolbar's vertical
   centering - the row is still touch/wheel scrollable */
.file-list-breadcrumbs {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	align-self: center;
	overflow-x: auto;
	overflow-y: hidden;
	scrollbar-width: none;
	/* Geometric centre matches the toolbar's icon buttons but the text's visual character
	   centre (x-height) sits ~2px above the icon glyph centres; nudge the entire row down with
	   a translate so the row reads as one baseline without breaking flex centering */
	transform: translateY(2px);
}
/* Each breadcrumb LI is itself a flex container so the inner link/icon glyph sits on the
   horizontal axis instead of falling to the text baseline (which sits a couple of pixels
   below the toolbar's icon button glyphs) */
:deep(.file-list-breadcrumbs > li),
:deep(.file-list-breadcrumbs > .v-breadcrumbs-item) {
	display: inline-flex;
	align-items: center;
}
.file-list-breadcrumbs::-webkit-scrollbar {
	display: none;
}
/* Chevron dividers default to text-baseline alignment, sitting ~1-2px below the toolbar's
   icon centres. Pull them into geometric centre so the whole row reads as one baseline */
:deep(.file-list-breadcrumbs .v-breadcrumbs-divider) {
	display: inline-flex;
	align-items: center;
	line-height: 1;
}

.file-list-card--empty {
	height: auto;
}

.file-list-body {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
}

:deep(.v-data-table-rows-no-data > td),
:deep(.v-data-table__tr--no-data > td) {
	padding: 0 !important;
	height: auto !important;
}

:deep(.v-data-table-rows-no-data),
:deep(.v-data-table__tr--no-data) {
	height: auto !important;
}

/* Keep the empty-state alert compact instead of letting the table's no-data row stretch the
   panel to its full height */
:deep(.v-data-table .v-table__wrapper) {
	min-height: 0;
}

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

:deep(.file-row--drop-target) {
	background-color: rgba(var(--v-theme-primary), 0.18) !important;
}

.tile-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 8px;
}

/* Vuetify sm breakpoint (600-959 px) - force exactly four tile columns so the Jobs page
   shows a consistent 4-up grid on tablets instead of auto-fill snapping to 2 or 3 depending
   on the exact width */
@media (min-width: 600px) and (max-width: 959px) {
	.tile-grid {
		grid-template-columns: repeat(4, 1fr);
	}
}

.tile-grid-empty {
	grid-column: 1 / -1;
}

.tile-card {
	cursor: pointer;
	min-height: 200px;
	/* Subtle tinted background instead of a hard outlined border - reads as a soft chip while
	   still grouping the tile contents visually. Falls back gracefully in both themes */
	background-color: rgba(var(--v-theme-on-surface), 0.04);
}

.tile-card:hover {
	background-color: rgba(var(--v-theme-on-surface), 0.07);
}

.tile-card-icon {
	min-height: 120px;
}

.tile-card--active {
	background-color: rgba(var(--v-theme-primary), 0.12) !important;
}

.tile-card-name {
	font-weight: 500;
}

/* Keep file-list rows single-line so dense tables (e.g. JobFileList's extra metadata columns)
   don't bloat row height by wrapping dates onto two lines. Cells that need to truncate (the
   name column at narrow widths) handle their own overflow via the slot template */
:deep(.v-data-table__tr > td) {
	white-space: nowrap;
}
</style>
