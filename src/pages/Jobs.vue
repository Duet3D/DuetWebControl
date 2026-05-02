<!-- Focused G-code file browser. Clicks on files start the print via M32; sub-directory navigation is
	 handled by JobFileList. Per the modernization plan this is the focused Jobs view; the multi-tab
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
	<JobFileList :options="browserOptions" :root-directory="gcodesDirectory"
				 :root-label="$t('list.jobs.root')" no-items-text="list.jobs.noJobs"
				 @file-click="startJob" />
</template>

<script lang="ts">
// Pre-fetch the gcodes directory listing during navigation so the page mounts with data
// already present. `lazy: true` means a slow board won't block the route transition - the
// component renders immediately and useFileBrowser seeds itself once data arrives
import { defineBasicLoader } from "vue-router/experimental";

import { useMachineStore } from "@/stores/machine";

export const useJobsListing = defineBasicLoader(async () => {
	const machineStore = useMachineStore();
	if (!machineStore.isConnected) {
		return [];
	}
	try {
		return await machineStore.getFileList(machineStore.model.directories.gCodes);
	} catch (e) {
		console.warn("Jobs loader failed", e);
		return [];
	}
}, { lazy: true });
</script>

<script setup lang="ts">
import type { FileBrowserItem } from "@/composables/useFileBrowser";
import JobFileList from "@/components/lists/JobFileList.vue";
import Path from "@/utils/path";

const machineStore = useMachineStore();
const { data: initialFiles } = useJobsListing();

const gcodesDirectory = computed(() => machineStore.model.directories.gCodes);

const browserOptions = computed(() => ({
	initialDirectory: gcodesDirectory.value,
	initialFiles: (initialFiles.value ?? []) as Array<FileBrowserItem>,
}));

async function startJob(item: FileBrowserItem, directory: string) {
	const filename = Path.combine(directory, item.name);
	await machineStore.sendCode(`M32 "${Path.escapeFilename(filename)}"`);
}
</script>
