<!-- Browses the macros directory and runs files on click. Refreshes whenever the file event bus
	 announces a write inside the current directory or a volume mount/unmount affects it -->
<template>
	<v-card>
		<v-card-title class="d-flex align-center">
			<v-icon size="small" class="mr-1">mdi-polymer</v-icon>
			{{ $t("list.macro.caption") }}
			<v-spacer />
			<span v-show="machineStore.isConnected" class="text-subtitle-2">{{ currentDirectory }}</span>
		</v-card-title>

		<v-card-text v-show="loading || filelist.length > 0 || !isRootDirectory" class="pa-0">
			<v-progress-linear v-show="loading" indeterminate class="my-0" />

			<v-list density="compact" class="pt-0">
				<v-list-item v-if="!isRootDirectory" @click="goUp">
					<template #prepend>
						<v-avatar size="32" color="grey-lighten-1">
							<v-icon size="small" color="white">mdi-arrow-up</v-icon>
						</v-avatar>
					</template>
					<v-list-item-title>{{ $t("list.baseFileList.goUp") }}</v-list-item-title>
				</v-list-item>

				<v-list-item v-for="item in filelist" :key="item.name" :disabled="uiStore.uiFrozen"
							 @click="itemClick(item)">
					<template #prepend>
						<v-avatar size="32" :color="item.isDirectory ? 'grey-lighten-1' : 'blue'">
							<v-icon size="small" color="white">{{ item.isDirectory ? "mdi-folder" : "mdi-file" }}</v-icon>
						</v-avatar>
					</template>
					<v-list-item-title>{{ item.displayName }}</v-list-item-title>
					<template v-if="!item.isDirectory && item.executing" #append>
						<v-progress-circular indeterminate size="20" width="2" color="blue" />
					</template>
				</v-list-item>
			</v-list>
		</v-card-text>

		<v-alert v-if="!loading && filelist.length === 0 && isRootDirectory" type="info" class="mb-0">
			{{ $t("list.macro.noMacros") }}
		</v-alert>
	</v-card>
</template>

<script setup lang="ts">
import { DisconnectedError, FileListItem } from "@duet3d/connectors";
import { Volume } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { LogLevel, useUiStore } from "@/stores/ui";
import { getErrorMessage } from "@/utils/errors";
import Events from "@/utils/events";
import Path from "@/utils/path";

interface MacroItem extends FileListItem {
	displayName: string;
	executing: boolean;
}

const machineStore = useMachineStore();
const uiStore = useUiStore();

const loading = ref(false);
const directory = ref(Path.macros);
const filelist = ref<Array<MacroItem>>([]);
let wasMounted = false;

const macrosDirectory = computed(() => machineStore.model.directories.macros);
const volumes = computed<Array<Volume>>(() => machineStore.model.volumes);

const isRootDirectory = computed(() => Path.equals(directory.value, macrosDirectory.value));
const currentDirectory = computed(() => {
	if (Path.startsWith(directory.value, macrosDirectory.value)) {
		const sub = directory.value.substring(macrosDirectory.value.length);
		if (sub.length === 0 || sub === "/") {
			return i18n.global.t("list.macro.root");
		}
		return i18n.global.t("list.macro.root") + (sub.startsWith("/") ? sub : `/${sub}`);
	}
	return directory.value;
});

async function loadDirectory(target: string) {
	if (loading.value) {
		return;
	}
	loading.value = true;
	try {
		const files = (await machineStore.getFileList(target)) as Array<MacroItem>;
		// Directories first, then alphabetical within each group
		files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
		files.sort((a, b) => (a.isDirectory === b.isDirectory) ? 0 : (a.isDirectory ? -1 : 1));
		for (const item of files) {
			item.displayName = Path.stripMacroFilename(item.name);
			item.executing = false;
		}
		directory.value = target;
		filelist.value = files;
	} catch (e) {
		if (!(e instanceof DisconnectedError)) {
			console.warn(e);
			uiStore.log(LogLevel.error, i18n.global.t("error.filelistRequestFailed"), getErrorMessage(e));
		}
	}
	loading.value = false;
}

function refresh() {
	return loadDirectory(directory.value);
}

async function itemClick(item: MacroItem) {
	if (uiStore.uiFrozen) {
		return;
	}
	const filename = Path.combine(directory.value, item.name);
	if (item.isDirectory) {
		await loadDirectory(filename);
		return;
	}
	if (item.executing) {
		return;
	}
	item.executing = true;
	try {
		await machineStore.sendCode(`M98 P"${Path.escapeFilename(filename)}"`);
	} catch (e) {
		if (!(e instanceof DisconnectedError)) {
			console.warn(e);
		}
	}
	item.executing = false;
}

function goUp() {
	return loadDirectory(Path.extractDirectory(directory.value));
}

function onFilesOrDirectoriesChanged(payload: { files?: Array<string>; volume?: number }) {
	if ((payload.files !== undefined && Path.filesAffectDirectory(payload.files, directory.value))
		|| payload.volume === Path.getVolume(directory.value)) {
		refresh();
	}
}

onMounted(() => {
	directory.value = macrosDirectory.value;
	if (machineStore.isConnected) {
		wasMounted = volumes.value.length > 0 && volumes.value[0].mounted;
		refresh();
	}
	Events.on("filesOrDirectoriesChanged", onFilesOrDirectoriesChanged);
});

onBeforeUnmount(() => {
	Events.off("filesOrDirectoriesChanged", onFilesOrDirectoriesChanged);
});

watch(macrosDirectory, (to, from) => {
	if (Path.equals(directory.value, from) || !Path.startsWith(directory.value, to)) {
		directory.value = to;
		refresh();
	}
});

watch(() => machineStore.isConnected, (connected) => {
	if (connected) {
		wasMounted = volumes.value.length > 0 && volumes.value[0].mounted;
		refresh();
	} else {
		directory.value = Path.macros;
		filelist.value = [];
	}
});

// Pull a fresh listing once the SD volume is (re-)mounted - until that point the connector returns nothing
watch(volumes, () => {
	if (!machineStore.isConnected) {
		return;
	}
	const volIndex = Path.getVolume(directory.value);
	if (volIndex < 0 || volIndex >= volumes.value.length) {
		return;
	}
	const mounted = volumes.value[volIndex].mounted;
	if (mounted !== wasMounted) {
		wasMounted = mounted;
		if (mounted) {
			refresh();
		}
	}
}, { deep: true });
</script>
