<template>
	<FileList v-model:directory="directory" :options="effectiveOptions" :root-directory="rootDirectory"
			  :root-label="rootLabel" :extra-headers="extraHeaders" :no-items-text="noItemsText"
			  :item-title="rowTitle" mode="jobs" v-bind="$attrs" @refresh="onRefresh"
			  @file-info="onFileInfo">
		<template #progress>
			<v-progress-linear v-if="fileinfoProgress !== -1" height="2"
							   :indeterminate="fileinfoTotal === 0"
							   :model-value="fileinfoTotal === 0 ? 0 : (fileinfoProgress / fileinfoTotal) * 100" />
		</template>

		<template #actions>
			<slot name="actions" />
		</template>

		<template #nameIcon="slotProps">
			<JobThumbnailCell :item="slotProps.item"
							  :tile="(slotProps as { tile?: boolean }).tile === true" />
		</template>

		<template #item.height="{ item }">{{ formatLength(item.height) }}</template>
		<template #item.layerHeight="{ item }">{{ formatLength(item.layerHeight) }}</template>
		<template #item.filament="{ item }">{{ formatFilament(item.filament) }}</template>
		<template #item.printTime="{ item }">{{ formatTime(item.printTime) }}</template>
		<template #item.simulatedTime="{ item }">{{ formatTime(item.simulatedTime) }}</template>
		<template #item.generatedBy="{ item }">{{ item.generatedBy || $t("generic.noValue") }}</template>

		<template #tileSummary="{ item }">
			<template v-if="!item.isDirectory">
				<div v-if="hasPrintTime(item as JobBrowserItem)" class="text-truncate">
					{{ formatTime((item as JobBrowserItem).printTime) }}
				</div>
				<div v-if="hasFilament(item as JobBrowserItem)" class="text-truncate">
					{{ formatFilament((item as JobBrowserItem).filament) }}
				</div>
			</template>
		</template>
	</FileList>

	<GCodeFileInfoDialog v-model:shown="fileInfoDialog.shown" :item="fileInfoDialog.item" />
</template>

<script setup lang="ts">
import type { FileBrowserItem, FileBrowserOptions } from "@/composables/useFileBrowser";
import { type GcodeThumbnailItem, useGcodeThumbnails } from "@/composables/useGcodeThumbnails";
import FileList from "@/components/lists/FileList.vue";
import GCodeFileInfoDialog from "@/components/dialogs/GCodeFileInfoDialog.vue";
import i18n from "@/i18n";
import { display, displayTime } from "@/utils/display";

import JobThumbnailCell from "./JobThumbnailCell.vue";

interface JobFileListHeader {
	title: string;
	key: string;
}

type JobBrowserItem = GcodeThumbnailItem;

const props = defineProps<{
	options: FileBrowserOptions;
	rootDirectory: string;
	rootLabel: string;
	noItemsText: string;
}>();

// Track the FileList's current directory. Exposed as `v-model:directory` so the parent (Jobs
// page) can mirror it into the URL; falls back to `props.options.initialDirectory` when the
// parent doesn't bind, preserving the original standalone behaviour
const directory = defineModel<string>("directory", {
	default: () => "",
});
if (!directory.value) {
	directory.value = props.options.initialDirectory;
}

const extraHeaders = computed<Array<JobFileListHeader>>(() => [
	{ title: i18n.global.t("list.jobs.height"), key: "height" },
	{ title: i18n.global.t("list.jobs.layerHeight"), key: "layerHeight" },
	{ title: i18n.global.t("list.jobs.filament"), key: "filament" },
	{ title: i18n.global.t("list.jobs.printTime"), key: "printTime" },
	{ title: i18n.global.t("list.jobs.simulatedTime"), key: "simulatedTime" },
	{ title: i18n.global.t("list.jobs.generatedBy"), key: "generatedBy" },
]);

const thumbnails = useGcodeThumbnails();
const { fileinfoProgress, fileinfoTotal } = thumbnails;

// Bump the fetch token + clear the progress refs on deactivate/unmount so a kept-alive parent
// doesn't reactivate with a stale progress bar
onDeactivated(thumbnails.cancelInFlight);
onBeforeUnmount(thumbnails.cancelInFlight);

// Explicit-refresh path: drop the cached fileInfos for the directory the user is reloading so
// the decorate flow re-fetches thumbnails + metadata rather than serving stale cache hits
function onRefresh(refreshedDirectory: string) {
	thumbnails.clearCacheForDirectory(refreshedDirectory);
}

const effectiveOptions = computed<FileBrowserOptions>(() => ({
	initialDirectory: props.options.initialDirectory,
	decorate: (items, dir) => {
		props.options.decorate?.(items, dir);
		thumbnails.decorate(items, dir);
	},
}));

// #region Cell formatters

// RRF often omits slicer-emitted fields (layerHeight, filament, printTime, ...) when the slicer
// didn't embed the matching comment header. Render "n/a" in those cells instead of leaving them
// blank so the table reads as deliberate rather than broken
function formatLength(value: number | null | undefined): string {
	if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
		return i18n.global.t("generic.noValue");
	}
	return display(value, 2, "mm");
}

function formatFilament(values: Array<number> | null | undefined): string {
	if (!values || values.length === 0) {
		return i18n.global.t("generic.noValue");
	}
	return values.map((v) => display(v, 1, "mm")).join(", ");
}

// Tile view skips empty rows entirely rather than showing the "n/a" placeholder that the
// dense table uses - n/a in a tile reads as noise where a missing line is fine
function hasPrintTime(item: JobBrowserItem): boolean {
	const v = item.printTime;
	if (v === null || v === undefined) {
		return false;
	}
	return (typeof v === "bigint" ? Number(v) : v) > 0;
}

function hasFilament(item: JobBrowserItem): boolean {
	return !!item.filament && item.filament.length > 0;
}

function formatTime(value: number | bigint | null | undefined): string {
	if (value === null || value === undefined) {
		return i18n.global.t("generic.noValue");
	}
	const seconds = typeof value === "bigint" ? Number(value) : value;
	if (seconds <= 0) {
		return i18n.global.t("generic.noValue");
	}
	return displayTime(seconds);
}

// #endregion

// #region File info

const fileInfoDialog = reactive<{ shown: boolean; item: GcodeThumbnailItem | null }>({
	shown: false,
	item: null,
});

// Opened by a long-press on a job tile (FileList emits `fileInfo`)
function onFileInfo(item: FileBrowserItem) {
	fileInfoDialog.item = item as GcodeThumbnailItem;
	fileInfoDialog.shown = true;
}

// Custom slicer info rendered as the row / tile hover tooltip
function rowTitle(item: FileBrowserItem): string | undefined {
	const customInfo = (item as GcodeThumbnailItem).customInfo;
	if (!customInfo) {
		return undefined;
	}
	const entries = Object.entries(customInfo);
	if (entries.length === 0) {
		return undefined;
	}
	return entries.map(([key, value]) => `${key}: ${value}`).join("\n");
}

// #endregion
</script>
