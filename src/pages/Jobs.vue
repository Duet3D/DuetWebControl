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

<script setup lang="ts">
import type { FileBrowserItem } from "@/composables/useFileBrowser";
import JobFileList from "@/components/lists/JobFileList.vue";
import { useMachineStore } from "@/stores/machine";
import Path from "@/utils/path";

const machineStore = useMachineStore();

const gcodesDirectory = computed(() => machineStore.model.directories.gCodes);

const browserOptions = computed(() => ({
	initialDirectory: gcodesDirectory.value,
}));

async function startJob(item: FileBrowserItem, directory: string) {
	const filename = Path.combine(directory, item.name);
	await machineStore.sendCode(`M32 "${Path.escapeFilename(filename)}"`);
}
</script>
