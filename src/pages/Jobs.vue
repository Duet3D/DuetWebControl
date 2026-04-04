<!-- Focused G-code file browser. Clicks on files start the print via M32; sub-directory navigation is
	 handled by FileList. Per the modernization plan this is the focused Jobs view; the multi-tab
	 Explorer for Macros/Filaments/System/Monaco is a separate route -->
<route lang="json">
{
	"meta": {
		"menu": {
			"category": "files",
			"icon": "mdi-file-code",
			"caption": "menu.files.jobs",
			"order": 10
		}
	}
}
</route>

<template>
	<FileList :options="browserOptions" :root-directory="gcodesDirectory" :root-label="$t('list.jobs.root')"
			  :extra-headers="extraHeaders" no-items-text="list.jobs.noJobs" @file-click="startJob" />
</template>

<script setup lang="ts">
import type { FileBrowserItem } from "@/composables/useFileBrowser";
import FileList from "@/components/lists/FileList.vue";
import { useMachineStore } from "@/stores/machine";
import Path from "@/utils/path";

const machineStore = useMachineStore();

const gcodesDirectory = computed(() => machineStore.model.directories.gCodes);

const browserOptions = computed(() => ({
	initialDirectory: gcodesDirectory.value,
}));

// The FileList default columns already cover Name/Size/Last Modified - leave room for future
// height/layer-height/printTime columns once full file-info fetching lands
const extraHeaders: Array<{ title: string; key: string }> = [];

async function startJob(item: FileBrowserItem, directory: string) {
	const filename = Path.combine(directory, item.name);
	await machineStore.sendCode(`M32 "${Path.escapeFilename(filename)}"`);
}
</script>
