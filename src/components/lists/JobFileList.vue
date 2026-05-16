<!-- Jobs-flavoured wrapper around FileList. Adds the gcode-specific columns (height, layer
	 height, filament, print/simulated time, generatedBy) and renders a per-row gcode-thumbnail
	 in place of the generic file icon when one is available.

	 Each directory load kicks off a sequential per-file getFileInfo fetch; results are cached
	 in the cache store so re-visiting the same folder doesn't re-fetch. A progress bar above
	 the table reflects how many files have been parsed so far. A request-token guard skips
	 stale fetches when the user navigates away mid-flight -->
<template>
	<FileList v-model:directory="directory" :options="effectiveOptions" :root-directory="rootDirectory"
			  :root-label="rootLabel" :extra-headers="extraHeaders" :no-items-text="noItemsText"
			  v-bind="$attrs">
		<template #progress>
			<v-progress-linear v-if="fileinfoProgress !== -1" height="2"
							   :indeterminate="fileinfoTotal === 0"
							   :model-value="fileinfoTotal === 0 ? 0 : (fileinfoProgress / fileinfoTotal) * 100" />
		</template>

		<template #nameIcon="{ item }">
			<JobThumbnailCell :item="item" />
		</template>

		<template #item.height="{ item }">{{ formatLength(item.height) }}</template>
		<template #item.layerHeight="{ item }">{{ formatLength(item.layerHeight) }}</template>
		<template #item.filament="{ item }">{{ formatFilament(item.filament) }}</template>
		<template #item.printTime="{ item }">{{ formatTime(item.printTime) }}</template>
		<template #item.simulatedTime="{ item }">{{ formatTime(item.simulatedTime) }}</template>
		<template #item.generatedBy="{ item }">{{ item.generatedBy ?? "" }}</template>

		<!-- Tile-mode override: surface print time + filament alongside the size so the most
			 useful gcode metadata is visible on the touchscreen tiles -->
		<template #tileSummary="{ item }">
			<template v-if="!item.isDirectory">
				<div v-if="formatTime((item as JobBrowserItem).printTime)" class="text-truncate">
					{{ formatTime((item as JobBrowserItem).printTime) }}
				</div>
				<div v-if="formatFilament((item as JobBrowserItem).filament)" class="text-truncate">
					{{ formatFilament((item as JobBrowserItem).filament) }}
				</div>
			</template>
		</template>
	</FileList>
</template>

<script setup lang="ts">
import type { GCodeFileInfo, ThumbnailInfo } from "@duet3d/objectmodel";

import type { FileBrowserItem, FileBrowserOptions } from "@/composables/useFileBrowser";
import FileList from "@/components/lists/FileList.vue";
import i18n from "@/i18n";
import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import { display, displayTime } from "@/utils/display";
import Path from "@/utils/path";

import JobThumbnailCell from "./JobThumbnailCell.vue";

interface JobFileListHeader {
	title: string;
	key: string;
}

const props = defineProps<{
	options: FileBrowserOptions;
	rootDirectory: string;
	rootLabel: string;
	noItemsText: string;
}>();

// Track the FileList's current directory locally so the per-row fetch loop always knows where
// it's reading from. A plain ref is enough - the parent doesn't need to bind it; we two-way
// bind it to the inner FileList via v-model:directory so navigation updates flow back here
const directory = ref(props.options.initialDirectory);

const machineStore = useMachineStore();
const cacheStore = useCacheStore();

const extraHeaders = computed<Array<JobFileListHeader>>(() => [
	{ title: i18n.global.t("list.jobs.height"), key: "height" },
	{ title: i18n.global.t("list.jobs.layerHeight"), key: "layerHeight" },
	{ title: i18n.global.t("list.jobs.filament"), key: "filament" },
	{ title: i18n.global.t("list.jobs.printTime"), key: "printTime" },
	{ title: i18n.global.t("list.jobs.simulatedTime"), key: "simulatedTime" },
	{ title: i18n.global.t("list.jobs.generatedBy"), key: "generatedBy" },
]);

// Per-directory request token so stale fetches abort silently when the user navigates away
let fetchToken = 0;
const fileinfoProgress = ref(-1);
const fileinfoTotal = ref(0);

const effectiveOptions = computed<FileBrowserOptions>(() => ({
	initialDirectory: props.options.initialDirectory,
	decorate: (items) => {
		props.options.decorate?.(items);
		seedJobMetadata(items);
		// decorate runs synchronously *inside* loadDirectory, just before useFileBrowser sets
		// its own directory ref. Wait for Vue's flush so the new directory has propagated to
		// our `directory` model before we issue per-row fetches
		const token = ++fetchToken;
		nextTick(() => fetchAllInfos(items, token));
	},
}));

// #region Per-row metadata fetch

interface JobBrowserItem extends FileBrowserItem {
	height?: number | null;
	layerHeight?: number | null;
	filament?: Array<number> | null;
	printTime?: number | bigint | null;
	simulatedTime?: number | bigint | null;
	generatedBy?: string | null;
	thumbnails?: Array<ThumbnailInfo> | null;
}

function seedJobMetadata(items: Array<FileBrowserItem>) {
	for (const item of items as Array<JobBrowserItem>) {
		if (item.isDirectory) continue;
		item.height = null;
		item.layerHeight = null;
		item.filament = null;
		item.printTime = null;
		item.simulatedTime = null;
		item.generatedBy = null;
		item.thumbnails = null;
	}
}

async function fetchAllInfos(items: Array<FileBrowserItem>, token: number) {
	const gcodeFiles = (items as Array<JobBrowserItem>).filter(
		(item) => !item.isDirectory && Path.isGCodePath(item.name, machineStore.model.directories.gCodes)
	);
	if (gcodeFiles.length === 0) {
		fileinfoProgress.value = -1;
		fileinfoTotal.value = 0;
		return;
	}

	// Snapshot the directory at fetch start - if the user navigates mid-fetch, the new pass'll
	// bump the token and this loop will exit on the next iteration
	const directorySnapshot = directory.value;
	fileinfoProgress.value = 0;
	fileinfoTotal.value = gcodeFiles.length;

	for (let i = 0; i < gcodeFiles.length; i++) {
		if (token !== fetchToken || !machineStore.isConnected) {
			break;
		}

		const item = gcodeFiles[i];
		const filename = Path.combine(directorySnapshot, item.name);
		let info: GCodeFileInfo | undefined = cacheStore.fileInfos[filename];
		if (!info) {
			try {
				info = await machineStore.getFileInfo(filename, true);
				cacheStore.setFileInfo(filename, info);
			} catch (e) {
				// One file failing should not block the rest; surface in the console only
				console.warn(`getFileInfo failed for ${filename}`, e);
			}
		}

		if (info && token === fetchToken) {
			applyInfo(item, info);
		}
		fileinfoProgress.value = i + 1;
	}

	if (token === fetchToken) {
		fileinfoProgress.value = -1;
		fileinfoTotal.value = 0;
	}
}

function applyInfo(item: JobBrowserItem, info: GCodeFileInfo) {
	item.height = info.height ?? null;
	item.layerHeight = info.layerHeight ?? null;
	item.filament = (info.filament && info.filament.length > 0) ? info.filament : null;
	item.printTime = info.printTime ?? null;
	item.simulatedTime = info.simulatedTime ?? null;
	item.generatedBy = info.generatedBy ?? null;
	item.thumbnails = Array.from(info.thumbnails ?? []);
}

// #endregion

// #region Cell formatters

function formatLength(value: number | null | undefined): string {
	if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
		return "";
	}
	return display(value, 2, "mm");
}

function formatFilament(values: Array<number> | null | undefined): string {
	if (!values || values.length === 0) {
		return "";
	}
	return values.map((v) => display(v, 1, "mm")).join(", ");
}

function formatTime(value: number | bigint | null | undefined): string {
	if (value === null || value === undefined) {
		return "";
	}
	const seconds = typeof value === "bigint" ? Number(value) : value;
	if (seconds <= 0) {
		return "";
	}
	return displayTime(seconds);
}

// #endregion
</script>
