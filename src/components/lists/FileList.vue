<template>
	<v-card ref="cardRef" :class="['file-list-card', 'd-flex', 'flex-column', { 'file-list-card--empty': shouldShrink }]">
		<v-toolbar :density="toolbarDensity" color="surface" class="px-2 flex-shrink-0">
			<v-btn icon variant="text" :size="toolbarBtnSize"
				   :disabled="!canGoUp" :title="$t('list.baseFileList.goUp')"
				   @dragover="onParentDragOver($event, parentDirectory)"
				   @dragleave="onParentDragLeave"
				   @drop="onParentDrop($event, parentDirectory)"
				   @click="browser.goUp()">
				<v-icon>mdi-arrow-up</v-icon>
			</v-btn>

			<v-breadcrumbs :items="breadcrumbItems" :density="isLargeToolbar ? 'default' : 'compact'"
						   class="pa-0 file-list-breadcrumbs">
				<template #divider>
					<v-icon :size="isLargeToolbar ? 'default' : undefined">mdi-chevron-right</v-icon>
				</template>
				<template #item="{ item }">
					<a v-if="item.href"
					   href="javascript:void(0)"
					   :class="[breadcrumbTextClass, 'text-no-wrap', 'file-list-breadcrumb-item']"
					   @dragover="onParentDragOver($event, item.href)"
					   @dragleave="onParentDragLeave"
					   @drop="onParentDrop($event, item.href)"
					   @click.prevent="browser.loadDirectory(item.href)">
						{{ item.title }}
					</a>
					<span v-else :class="[breadcrumbTextClass, 'text-no-wrap', 'file-list-breadcrumb-item']">
						{{ item.title }}
					</span>
				</template>
			</v-breadcrumbs>

			<v-spacer />

			<slot name="actions" />

			<!-- Volume picker / other upload-row inserts always stay visible, even when the rest
				 of the toolbar collapses into the "..." menu - they're contextual selectors -->
			<slot name="upload-prepend" />

			<template v-if="!collapseToolbar">
				<v-btn v-if="!noRename && selection.length === 1" variant="text" icon :size="toolbarBtnSize"
					   :disabled="uiStore.uiFrozen" :title="$t('button.rename.caption')" @click="startRename">
					<v-icon>mdi-rename-box</v-icon>
				</v-btn>

				<v-btn v-if="!noDelete && selection.length > 0" variant="text" icon :size="toolbarBtnSize"
					   :disabled="uiStore.uiFrozen" :title="$t('button.delete.caption')" @click="startDelete">
					<v-icon>mdi-delete</v-icon>
				</v-btn>

				<v-btn v-if="!noNewFile" variant="text" icon :size="toolbarBtnSize"
					   :disabled="uiStore.uiFrozen"
					   :title="$t('button.newFile.caption')" @click="startNewFile">
					<v-icon>mdi-file-plus</v-icon>
				</v-btn>

				<v-btn v-if="!noNewDirectory" variant="text" icon :size="toolbarBtnSize"
					   :disabled="uiStore.uiFrozen"
					   :title="$t('button.newDirectory.caption')" @click="startNewDirectory">
					<v-icon>mdi-folder-plus</v-icon>
				</v-btn>

				<v-menu v-if="effectiveViewMode === 'tiles'">
					<template #activator="{ props: activatorProps }">
						<v-btn v-bind="activatorProps" variant="text" icon :size="toolbarBtnSize"
							   :title="$t('list.fileList.sortBy')">
							<v-icon>mdi-sort</v-icon>
						</v-btn>
					</template>
					<v-list density="compact">
						<v-list-item v-for="opt in sortOptions" :key="opt.key"
									 :active="activeSortKey === opt.key" :title="opt.label"
									 @click="onSortOptionClick(opt.key)">
							<template #append>
								<v-icon v-if="activeSortKey === opt.key" size="small">
									{{ activeSortOrder === "asc" ? "mdi-arrow-up" : "mdi-arrow-down" }}
								</v-icon>
							</template>
						</v-list-item>
					</v-list>
				</v-menu>

				<v-menu v-if="!noViewMode">
					<template #activator="{ props: activatorProps }">
						<v-btn v-bind="activatorProps" variant="text" icon :size="toolbarBtnSize"
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

				<v-btn v-if="!noUpload" variant="text" icon :size="toolbarBtnSize"
					   :disabled="uiStore.uiFrozen || uploading"
					   :loading="uploading" :title="$t('button.upload.caption')" @click="pickFiles">
					<v-icon>mdi-cloud-upload</v-icon>
				</v-btn>

				<v-btn variant="text" icon :size="toolbarBtnSize"
					   :loading="browser.loading.value" :disabled="uiStore.uiFrozen"
					   :title="$t('button.refresh.caption')" @click="onRefreshClicked">
					<v-icon>mdi-refresh</v-icon>
				</v-btn>
			</template>

			<v-menu v-else>
				<template #activator="{ props: activatorProps }">
					<v-btn v-bind="activatorProps" variant="text" icon :size="toolbarBtnSize"
						   :disabled="uiStore.uiFrozen"
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
					<v-list-item v-if="!noNewFile" prepend-icon="mdi-file-plus"
								 :title="$t('button.newFile.caption')"
								 :disabled="uiStore.uiFrozen" @click="startNewFile" />
					<v-list-item v-if="!noNewDirectory" prepend-icon="mdi-folder-plus"
								 :title="$t('button.newDirectory.caption')"
								 :disabled="uiStore.uiFrozen" @click="startNewDirectory" />
					<v-divider v-if="!noViewMode" />
					<v-list-item v-if="!noViewMode" prepend-icon="mdi-view-dashboard-edit-outline"
								 :title="$t('list.fileList.layout')"
								 @click="layoutDialog.shown = true" />
					<v-divider />
					<v-list-item v-if="!noUpload" prepend-icon="mdi-cloud-upload"
								 :title="$t('button.upload.caption')"
								 :disabled="uiStore.uiFrozen || uploading" @click="pickFiles" />
					<v-list-item prepend-icon="mdi-refresh" :title="$t('button.refresh.caption')"
								 :disabled="uiStore.uiFrozen" @click="onRefreshClicked" />
				</v-list>
			</v-menu>
		</v-toolbar>

		<slot name="progress" />

		<div class="file-drop-target file-list-body" @drop.prevent="onDrop">
			<UploadBackdrop v-if="dragActive" />
			<v-pull-to-refresh :disabled="!mobile" @load="onPullRefresh">
			<div v-if="effectiveViewMode === 'tiles'" class="tile-grid pa-2">
				<v-alert v-if="sortedFileList.length === 0 && !browser.loading.value"
						 type="info" variant="tonal" density="compact" class="tile-grid-empty">
					{{ $t(noItemsText) }}
				</v-alert>
				<v-card v-for="item in sortedFileList" :key="item.name"
						class="tile-card d-flex flex-column" variant="flat" rounded="lg"
						:class="{ 'tile-card--active': selection.includes(item.name) }"
						:title="itemTitle?.(item)"
						@click="onTileClick($event, item)"
						@contextmenu="onTileContextMenu($event, item)"
						@touchstart="onTileTouchStart($event, item)" @touchend="cancelTileLongPress"
						@touchmove="cancelTileLongPress" @touchcancel="cancelTileLongPress">
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
			<v-list-item v-if="contextMenu.target && !contextMenu.target.isDirectory && fileMode === 'jobs' && effectiveViewMode === 'tiles'"
						 @click="showFileInfoFromContext">
				<template #prepend>
					<v-icon>mdi-information-outline</v-icon>
				</template>
				<v-list-item-title>{{ $t("list.fileList.fileInfo") }}</v-list-item-title>
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

	<ConfirmDialog v-model:shown="forceMoveDialog.shown" :title="forceMoveDialog.title"
				   :prompt="forceMoveDialog.prompt" icon="mdi-file-replace-outline"
				   @confirmed="performForceMove" />

	<v-dialog v-model="layoutDialog.shown" width="480">
		<v-card>
			<v-card-title>{{ $t("list.fileList.layout") }}</v-card-title>
			<v-card-text class="pt-4">
				<v-select v-if="!noViewMode" v-model="viewMode" :label="$t('list.fileList.viewMode')"
						  :title="$t('list.fileList.viewMode')"
						  :items="layoutViewModeItems" variant="outlined" hide-details
						  density="comfortable" class="mb-4" />
				<div class="d-flex ga-3">
					<v-select v-model="layoutSortKey" :label="$t('list.fileList.sortBy')"
							  :title="$t('list.fileList.sortBy')"
							  :items="sortOptions" item-value="key" item-title="label"
							  variant="outlined" hide-details density="comfortable" class="flex-grow-1" />
					<v-select v-model="layoutSortOrder" :label="$t('list.fileList.sortDirection')"
							  :title="$t('list.fileList.sortDirection')"
							  :items="sortDirectionItems" variant="outlined" hide-details
							  density="comfortable" class="flex-grow-1" />
				</div>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn variant="text" @click="layoutDialog.shown = false">
					{{ $t("generic.close") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>

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
import { useFileDrag } from "@/composables/useFileDrag";
import { useFileBrowser } from "@/composables/useFileBrowser";
import { useLargeButtons } from "@/composables/useLargeButtons";
import { useCacheStore } from "@/stores/cache";
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
	/**
	 * Optional column-visibility predicate. When given, the column is hidden unless at least
	 * one row in the current directory satisfies it - keeps all-"n/a" columns off the table
	 */
	hasValue?: (item: FileBrowserItem) => boolean;
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
	/**
	 * Per-item `title` attribute (hover tooltip) for table rows and tiles - the Jobs list uses
	 * it to surface a file's custom slicer info
	 */
	itemTitle?: (item: FileBrowserItem) => string | undefined;
}>();

const fileMode = computed(() => props.mode ?? "files");

const emit = defineEmits<{
	fileClick: [item: FileBrowserItem, directory: string];
	fileEdit: [item: FileBrowserItem, directory: string];
	fileRunMacro: [item: FileBrowserItem, directory: string];
	fileSimulate: [item: FileBrowserItem, directory: string];
	fileInfo: [item: FileBrowserItem, directory: string];
	refresh: [directory: string];
}>();

// Touch long-press on a tile opens the same context menu a desktop right-click would, so
// touch and mouse behave identically. The synthesised contextmenu fires onRowContextMenu with
// the touch coordinates so the menu anchors at the finger position. suppressTileClick swallows
// the click the browser synthesises after a long-press; suppressNativeContextMenu swallows the
// native contextmenu event Android Chrome also fires for the same long-press
let tileLongPressTimer: number | undefined;
let nativeContextMenuClearTimer: number | undefined;
const suppressTileClick = ref(false);
let suppressNativeContextMenu = false;

function onTileTouchStart(event: TouchEvent, item: FileBrowserItem) {
	suppressTileClick.value = false;
	const touch = event.touches[0];
	if (!touch) {
		return;
	}
	const clientX = touch.clientX, clientY = touch.clientY;
	tileLongPressTimer = window.setTimeout(() => {
		tileLongPressTimer = undefined;
		suppressTileClick.value = true;
		suppressNativeContextMenu = true;
		if (nativeContextMenuClearTimer !== undefined) {
			clearTimeout(nativeContextMenuClearTimer);
		}
		nativeContextMenuClearTimer = window.setTimeout(() => {
			suppressNativeContextMenu = false;
			nativeContextMenuClearTimer = undefined;
		}, 800);
		const synthetic = new MouseEvent("contextmenu", { clientX, clientY, bubbles: false });
		onRowContextMenu(synthetic, item);
	}, 500);
}

function cancelTileLongPress() {
	if (tileLongPressTimer !== undefined) {
		clearTimeout(tileLongPressTimer);
		tileLongPressTimer = undefined;
	}
}

function onTileContextMenu(event: MouseEvent, item: FileBrowserItem) {
	if (suppressNativeContextMenu) {
		event.preventDefault();
		event.stopPropagation();
		return;
	}
	onRowContextMenu(event, item);
}

function onTileClick(event: MouseEvent, item: FileBrowserItem) {
	if (suppressTileClick.value) {
		suppressTileClick.value = false;
		return;
	}
	// Tile view has no checkbox UI, so ctrl/cmd-click is the multi-select gesture; a plain
	// click still opens the file or navigates into the folder
	if (event.ctrlKey || event.metaKey) {
		if (selection.value.includes(item.name)) {
			selection.value = selection.value.filter((entry) => entry !== item.name);
		} else {
			selection.value = [...selection.value, item.name];
		}
		return;
	}
	onRowClick(null, { item });
}

onBeforeUnmount(() => {
	cancelTileLongPress();
	if (nativeContextMenuClearTimer !== undefined) {
		clearTimeout(nativeContextMenuClearTimer);
		nativeContextMenuClearTimer = undefined;
	}
});

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
// Mirrors the default layout's app-bar enlargement: at the sm breakpoint with the user's
// largeButtons setting on, the toolbar drops its compact density and the buttons jump to
// large so small-touchscreen users get finger-friendly targets here too
const { large: isLargeToolbar, btnSize: toolbarBtnSize } = useLargeButtons();
const toolbarDensity = computed<"default" | "compact">(() => isLargeToolbar.value ? "default" : "compact");
const breadcrumbTextClass = computed(() => isLargeToolbar.value ? "text-body-large" : "text-body-medium");
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
		// Directories carry no size, so a directory-only listing drops the Size column entirely
		{ title: i18n.global.t("list.baseFileList.size"), key: "size", hasValue: (item) => !item.isDirectory },
	];
	if (!isXs.value) {
		headers.push({ title: i18n.global.t("list.baseFileList.lastModified"), key: "lastModified" });
	}
	return headers;
});

// Drop columns whose every row would render "n/a" - a header with a `hasValue` predicate stays
// only when at least one item in the current directory satisfies it
const effectiveHeaders = computed(() => {
	const all = [...defaultHeaders.value, ...(props.extraHeaders ?? [])];
	const items = browser.filelist.value;
	return all.filter(header => !header.hasValue || items.some(item => header.hasValue!(item)));
});

// v-data-table sorts purely by the active column - left to itself it interleaves files and
// directories alphabetically. Force `isDirectory` (boolean, desc => true-first) as the primary
// key so dirs always cluster at the top, then keep the user's column choice as the secondary
// key. The setter pulls that secondary key out of whatever v-data-table emits and writes it
// to the cache; the getter rebuilds the canonical [isDirectory, user] array on every read so
// dirs stay grouped regardless of which header the user just clicked
type SortEntry = { key: string; order: "asc" | "desc" };

const cacheStore = useCacheStore();
const sortingKey = computed(() => props.mode ?? "files");

// Per-mode default sort: jobs open with the most recently uploaded slice at the top, everything
// else alphabetically
const DEFAULT_SORTS: Record<string, SortEntry> = {
	jobs: { key: "lastModified", order: "desc" },
};

const internalSortBy = computed<Array<SortEntry>>({
	get() {
		const persisted: SortEntry = cacheStore.sorting[sortingKey.value]
			?? DEFAULT_SORTS[sortingKey.value]
			?? { key: "name", order: "asc" };
		return [{ key: "isDirectory", order: "desc" as const }, persisted];
	},
	set(value: Array<SortEntry>) {
		const userPart = value.find((entry) => entry.key !== "isDirectory");
		if (userPart) {
			cacheStore.sorting[sortingKey.value] = { key: userPart.key, order: userPart.order };
			return;
		}
		// We always inject isDirectory as a fixed primary key, so the user column is the second
		// entry and the array length is never 1. v-data-table only flips a descending column back
		// to ascending when the sort length is exactly 1; with two entries it drops the clicked
		// column instead, emitting a sortBy without a user part. Treat that emission as the intended
		// toggle so a descending column keeps cycling instead of sticking on descending
		const current = cacheStore.sorting[sortingKey.value]
			?? DEFAULT_SORTS[sortingKey.value]
			?? { key: "name", order: "asc" as const };
		cacheStore.sorting[sortingKey.value] = { key: current.key, order: current.order === "asc" ? "desc" : "asc" };
	},
});

// Tile view has no column headers to click, so the sort key/order is picked from a toolbar
// menu instead. Persisted entry is shared with the list view's v-data-table so flipping between
// view modes preserves the choice
const activeSortKey = computed(() =>
	cacheStore.sorting[sortingKey.value]?.key
		?? DEFAULT_SORTS[sortingKey.value]?.key
		?? "name"
);
const activeSortOrder = computed(() =>
	cacheStore.sorting[sortingKey.value]?.order
		?? DEFAULT_SORTS[sortingKey.value]?.order
		?? "asc"
);

const sortOptions = computed<Array<{ key: string; label: string }>>(
	() => effectiveHeaders.value.map((h) => ({ key: h.key, label: h.title }))
);

function onSortOptionClick(key: string) {
	const current = cacheStore.sorting[sortingKey.value]
		?? DEFAULT_SORTS[sortingKey.value]
		?? { key: "name", order: "asc" as const };
	if (current.key === key) {
		cacheStore.sorting[sortingKey.value] = { key, order: current.order === "asc" ? "desc" : "asc" };
	} else {
		cacheStore.sorting[sortingKey.value] = { key, order: "asc" };
	}
}

// Layout dialog (collapsed toolbar entry) - one panel with view mode + sort key + sort
// direction. v-models write straight back to the persisted state so changes take effect live
const layoutDialog = reactive({ shown: false });

const layoutViewModeItems = computed(() => viewModeOptions.map((opt) => ({
	value: opt.value,
	title: i18n.global.t(opt.label),
})));

const sortDirectionItems = computed(() => [
	{ value: "asc", title: i18n.global.t("list.fileList.sortAscending") },
	{ value: "desc", title: i18n.global.t("list.fileList.sortDescending") },
]);

const layoutSortKey = computed<string>({
	get: () => activeSortKey.value,
	set: (key) => {
		cacheStore.sorting[sortingKey.value] = { key, order: activeSortOrder.value };
	},
});

const layoutSortOrder = computed<"asc" | "desc">({
	get: () => activeSortOrder.value,
	set: (order) => {
		cacheStore.sorting[sortingKey.value] = { key: activeSortKey.value, order };
	},
});

// v-data-table re-sorts internally from internalSortBy; the tile grid iterates filelist.value
// as-is, so apply the same sort here. Directories always cluster at the top regardless of order
const sortedFileList = computed<Array<FileBrowserItem>>(() => {
	const items = [...browser.filelist.value];
	const dir = activeSortOrder.value === "asc" ? 1 : -1;
	const key = activeSortKey.value;
	return items.sort((a, b) => {
		if (a.isDirectory !== b.isDirectory) {
			return a.isDirectory ? -1 : 1;
		}
		return compareSortValues(a, b, key) * dir;
	});
});

function compareSortValues(a: FileBrowserItem, b: FileBrowserItem, key: string): number {
	const va = (a as Record<string, unknown>)[key];
	const vb = (b as Record<string, unknown>)[key];
	if (va === undefined || va === null) {
		return vb === undefined || vb === null ? 0 : -1;
	}
	if (vb === undefined || vb === null) {
		return 1;
	}
	if (typeof va === "number" && typeof vb === "number") {
		return va - vb;
	}
	if (typeof va === "bigint" && typeof vb === "bigint") {
		return va < vb ? -1 : va > vb ? 1 : 0;
	}
	if (va instanceof Date && vb instanceof Date) {
		return va.getTime() - vb.getTime();
	}
	if (Array.isArray(va) && Array.isArray(vb)) {
		const ta = va.reduce<number>((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
		const tb = vb.reduce<number>((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
		return ta - tb;
	}
	return String(va).localeCompare(String(vb), undefined, { sensitivity: "base", numeric: true });
}

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

// The drop backdrop follows the shared window-level drag flag - the file list fills its page,
// so any file dragged over it is a candidate upload. Hidden when this list opts out of uploads
const { draggingFiles } = useFileDrag();
const dragActive = computed(() => !props.noUpload && draggingFiles.value);

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

// Files the firmware-install pipeline knows how to place (bundles, board binaries, SBC
// packages). Anything else - g-code, config, CSV - is a plain upload to the browsed directory
// even in a firmware-aware location: the pipeline's catch-all routes unrecognised files into
// the system directory, so without this gate a job file dropped at 0:/ would land in /sys
const firmwarePayloadPattern = /\.(zip|bin|uf2|deb)$/i;

async function uploadFiles(files: Array<File>) {
	if (props.noUpload || files.length === 0) {
		return;
	}
	uploading.value = true;
	try {
		if (props.firmwareAware && files.some((file) => firmwarePayloadPattern.test(file.name))) {
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
		// Auto-reload DWC when the user just replaced its index.html under directories.web
		// (typically an unzipped www bundle dropped into the web directory). The firmware-install
		// path does the same via plan.webInterfaceTouched - mirror it here for the plain path
		const webDir = machineStore.model.directories.web;
		const touchedWebInterface = payload.some((p) =>
			Path.equals(Path.extractDirectory(p.filename), webDir)
			&& /^index\.html(\.gz)?$/i.test(Path.extractFileName(p.filename)));
		if (touchedWebInterface && machineStore.connector?.hostname === location.host) {
			location.reload();
		}
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

// dragover is prevented globally by useFileDrag, so the drop fires here without this list
// needing its own dragenter/dragover/dragleave handlers
async function onDrop(event: DragEvent) {
	if (props.noUpload || !event.dataTransfer || event.dataTransfer.files.length === 0) {
		return;
	}
	await uploadFiles(Array.from(event.dataTransfer.files));
}

// #endregion

// #region Context menu + download

const contextMenu = reactive({
	shown: false,
	x: 0,
	y: 0,
	target: null as FileBrowserItem | null,
});

// Right-click auto-selects the target row/tile so the context menu's actions (which read
// selection) operate on it. The previous selection is snapshotted here and restored when the
// menu dismisses without an action, so a stray right-click doesn't leave a tile visibly
// "selected" with no checkbox UI to clear it. suppressContextMenuRestore guards the
// shown=false/true re-open dance in onRowContextMenu - the transient false there is not a
// real dismissal
let preContextMenuSelection: Array<string> | null = null;
let suppressContextMenuRestore = false;

watch(() => contextMenu.shown, (shown) => {
	if (!shown && !suppressContextMenuRestore && preContextMenuSelection !== null) {
		selection.value = preContextMenuSelection;
		preContextMenuSelection = null;
	}
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
		title: props.itemTitle?.(item),
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

// A single-item move that hits a name collision pops the overwrite dialog; a multi-item drop
// surfaces a plain error notification because resolving each conflict mid-batch would cascade
// prompts. The dialog confirm path retries the same move with the connector's force flag and
// owns the success / refresh side-effects for that branch
const forceMoveDialog = reactive({
	shown: false,
	title: "",
	prompt: "",
	from: "",
	to: "",
	targetLabel: "",
});

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
			if (payload.names.length === 1) {
				forceMoveDialog.from = from;
				forceMoveDialog.to = to;
				forceMoveDialog.targetLabel = targetLabel;
				forceMoveDialog.title = i18n.global.t("dialog.forceMove.title");
				forceMoveDialog.prompt = i18n.global.t("dialog.forceMove.prompt", [name, targetLabel]);
				forceMoveDialog.shown = true;
				return;
			}
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

async function performForceMove() {
	const { from, to, targetLabel } = forceMoveDialog;
	const name = Path.extractFileName(to);
	try {
		await machineStore.move(from, to, true);
		await browser.refresh();
		selection.value = [];
		uiStore.log(LogLevel.success, i18n.global.t("list.fileList.movedOne", [name, targetLabel]));
	} catch (e) {
		uiStore.notifyError(e, i18n.global.t("list.fileList.moveError", [name, targetLabel]));
	}
}
// #endregion

function onRowContextMenu(event: MouseEvent, item: FileBrowserItem) {
	event.preventDefault();
	event.stopPropagation();

	// Auto-select the right-clicked target unless the user explicitly multi-selected first;
	// the previous selection is snapshotted so dismissing the menu without an action restores it
	if (!selection.value.includes(item.name)) {
		preContextMenuSelection = [...selection.value];
		selection.value = [item.name];
	} else {
		preContextMenuSelection = null;
	}

	contextMenu.target = item;
	contextMenu.x = event.clientX;
	contextMenu.y = event.clientY;
	suppressContextMenuRestore = true;
	contextMenu.shown = false;
	nextTick(() => {
		contextMenu.shown = true;
		suppressContextMenuRestore = false;
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

function showFileInfoFromContext() {
	contextMenu.shown = false;
	const target = contextMenu.target;
	if (!target || target.isDirectory) {
		return;
	}
	emit("fileInfo", target, browser.directory.value);
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
		// Encode the file into the route path so the destination plugin page reads it from its
		// own route params on mount - the global event would race the lazy chunk. The file
		// arrives as <pluginPath>/<volume>/<sd-path>
		const match = /^(\d+):\/(.*)$/.exec(fullPath);
		const volume = match ? match[1] : "0";
		const filePath = match ? match[2] : fullPath.replace(/^\/+/, "");
		await router.push(`${item.path}/${volume}/${filePath}`);
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
	transform: translateY(2px);
}
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

:deep(.v-data-table .v-table__wrapper) {
	min-height: 0;
}

.file-drop-target {
	position: relative;
	container-type: inline-size;
}

:deep(.file-row--drop-target) {
	background-color: rgba(var(--v-theme-primary), 0.18) !important;
}

.file-list-breadcrumb-item {
	padding: 2px 6px;
	border-radius: 4px;
	transition: background-color 0.12s ease;
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

:deep(.v-data-table__tr > td) {
	white-space: nowrap;
}
</style>
