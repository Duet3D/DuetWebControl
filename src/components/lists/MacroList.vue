<style scoped>
.macro-list-card {
	min-height: 0;
}
.macro-list-card :deep(.v-card-title) {
	flex-shrink: 0;
}
.macro-list-body {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	/* Stops Firefox Android's native pull-to-refresh from swallowing the gesture before
	   VPullToRefresh sees it (honored since GeckoView/Firefox 88) */
	overscroll-behavior-y: contain;
}
/* Applied only while pull-to-refresh is active (mobile breakpoint). VPullToRefresh caches its
   scroll parent once on mount; with `auto` a still-empty async list has no scrollbar yet, so it
   latches onto an outer container stuck at scrollTop 0 and refreshes on any downward drag mid-list.
   `scroll` makes this element a scroll parent regardless of content. Desktop keeps `auto` (no
   permanent scrollbar) and has pull-to-refresh disabled anyway */
.macro-list-body.pull-scroll {
	overflow-y: scroll;
}
</style>

<template>
	<PanelCard icon="mdi-polymer" :title="$t('list.macro.caption')" class="d-flex flex-column macro-list-card">
		<template #title-append>
			<v-spacer />
			<span v-show="machineStore.isConnected" class="text-title-small">{{ currentDirectory }}</span>
		</template>

		<v-card-text class="pa-0 macro-list-body" :class="{ 'pull-scroll': mobile }">
			<v-progress-linear v-show="loading" indeterminate class="my-0" />

			<v-pull-to-refresh :disabled="!mobile" @load="onPullRefresh">
				<v-alert v-if="showEmptyAlert" :type="emptyAlertType" :text="$t(emptyAlertText)" tile density="compact" />

				<v-list v-else :density="listDensity" class="pt-0">
					<v-list-item v-if="!isRootDirectory && settings.showDirectories" @click="goUp">
						<template #prepend>
							<v-avatar size="32" color="grey-lighten-1">
								<v-icon size="small" color="white">mdi-arrow-up</v-icon>
							</v-avatar>
						</template>
						<v-list-item-title>{{ $t("list.baseFileList.goUp") }}</v-list-item-title>
					</v-list-item>

					<v-list-item v-for="item in displayedFiles" :key="item.name" :disabled="uiStore.uiFrozen"
								 @click="itemClick(item)" v-context-menu="(x: number, y: number) => openContextMenu(item, x, y)">
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
			</v-pull-to-refresh>

			<v-menu v-model="contextMenu.shown" :target="[contextMenu.x, contextMenu.y]">
				<v-list :density="listDensity">
					<template v-if="contextMenu.item && !contextMenu.item.isDirectory">
						<v-list-item @click="runMacro(contextMenu.item)">
							<template #prepend>
								<v-icon>mdi-play</v-icon>
							</template>
							<v-list-item-title>{{ $t("list.macro.run") }}</v-list-item-title>
						</v-list-item>
						<v-list-item @click="editMacro(contextMenu.item)">
							<template #prepend>
								<v-icon>mdi-pencil</v-icon>
							</template>
							<v-list-item-title>{{ $t("list.fileList.edit") }}</v-list-item-title>
						</v-list-item>
					</template>
					<v-list-item @click="openInExplorer(contextMenu.item)">
						<template #prepend>
							<v-icon>mdi-folder-open</v-icon>
						</template>
						<v-list-item-title>{{ $t("list.macro.openInExplorer") }}</v-list-item-title>
					</v-list-item>
				</v-list>
			</v-menu>
		</v-card-text>

		<template #settings>
			<v-switch v-model="settings.showDirectories" color="primary"
					  :label="$t('list.macro.settings.showDirectories')"
					  v-hint="$t('list.macro.settings.showDirectoriesHint')"
					  density="comfortable" hide-details />

			<v-divider class="my-3" />

			<v-text-field v-model="settings.startDirectory"
						  :label="$t('list.macro.settings.startDirectory')"
						  v-hint="$t('list.macro.settings.startDirectoryHint')"
						  :placeholder="macrosDirectory" persistent-placeholder
						  variant="outlined" density="comfortable" hide-details />
			<v-text-field v-model="settings.includeFilter" class="mt-3" placeholder="*.g"
						  :label="$t('list.macro.settings.includeFilter')"
						  v-hint="$t('list.macro.settings.includeFilterHint')"
						  variant="outlined" density="comfortable" hide-details />
			<v-text-field v-model="settings.excludeFilter" class="mt-3"
						  :label="$t('list.macro.settings.excludeFilter')"
						  v-hint="$t('list.macro.settings.excludeFilterHint')"
						  variant="outlined" density="comfortable" hide-details />
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import { DirectoryNotFoundError, DisconnectedError, FileListItem } from "@duet3d/connectors";
import { Volume } from "@duet3d/objectmodel";

import { useComponentSettings } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import Events from "@/utils/events";
import Path from "@/utils/path";

interface MacroItem extends FileListItem {
	displayName: string;
	executing: boolean;
}

const machineStore = useMachineStore();
const uiStore = useUiStore();
const router = useRouter();
const { mdAndUp, mobile } = useDisplay();

interface MacroListSettings {
	showDirectories: boolean;
	// Empty falls back to the firmware macros directory
	startDirectory: string;
	// Comma-separated glob patterns; empty disables that filter
	includeFilter: string;
	excludeFilter: string;
}

const settings = useComponentSettings<MacroListSettings>({
	showDirectories: true,
	startDirectory: "",
	includeFilter: "",
	excludeFilter: "",
});

// Roomier rows on touch surfaces - same touch-target trade-off the file table makes
const listDensity = computed<"default" | "comfortable" | "compact">(
	() => mdAndUp.value ? "compact" : "default"
);

const loading = ref(false);
const directory = ref(Path.macros);
const filelist = ref<Array<MacroItem>>([]);
const errorReason = ref<"missing" | "error" | null>(null);
let wasMounted = false;

const macrosDirectory = computed(() => machineStore.model.directories.macros);
const volumes = computed<Array<Volume>>(() => machineStore.model.volumes);

// Empty start directory falls back to the firmware macros directory; a relative value resolves
// against it, an absolute one (leading slash or volume prefix) replaces it outright
const rootDirectory = computed(() => {
	const configured = settings.value.startDirectory.trim();
	return configured.length === 0 ? macrosDirectory.value : Path.combine(macrosDirectory.value, configured);
});

const isRootDirectory = computed(() => Path.equals(directory.value, rootDirectory.value));
const currentDirectory = computed(() => {
	if (Path.startsWith(directory.value, rootDirectory.value)) {
		const sub = directory.value.substring(rootDirectory.value.length);
		if (sub.length === 0 || sub === "/") {
			return i18n.global.t("list.macro.root");
		}
		return i18n.global.t("list.macro.root") + (sub.startsWith("/") ? sub : `/${sub}`);
	}
	return Path.pretty(directory.value);
});

// Comma-separated glob patterns (`*` and `?` wildcards) compiled to case-insensitive matchers
function compileGlobs(filter: string): Array<RegExp> {
	return filter.split(",")
		.map(entry => entry.trim())
		.filter(entry => entry.length > 0)
		.map(entry => {
			const escaped = entry.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
			return new RegExp(`^${escaped}$`, "i");
		});
}

const includePatterns = computed(() => compileGlobs(settings.value.includeFilter));
const excludePatterns = computed(() => compileGlobs(settings.value.excludeFilter));

// filelist narrowed to what the panel settings allow: directory entries gated by showDirectories,
// files run through the optional include/exclude name filters
const displayedFiles = computed<Array<MacroItem>>(() =>
	filelist.value.filter(item => {
		if (item.isDirectory) {
			return settings.value.showDirectories;
		}
		if (includePatterns.value.length > 0 && !includePatterns.value.some(pattern => pattern.test(item.name))) {
			return false;
		}
		return !excludePatterns.value.some(pattern => pattern.test(item.name));
	})
);

// No-data alert variant + text keyed off the last load result: "missing" reads as a warning (the
// directory just doesn't exist), "error" as a hard failure, and an empty existing root as info
const showEmptyAlert = computed(() => !loading.value && (errorReason.value !== null || (displayedFiles.value.length === 0 && isRootDirectory.value)));
const emptyAlertType = computed(() => errorReason.value === "missing" ? "warning" : (errorReason.value === "error" ? "error" : "info"));
const emptyAlertText = computed(() => {
	switch (errorReason.value) {
		case "missing": return "list.macro.directoryNotFound";
		case "error": return "list.macro.loadFailed";
		default: return "list.macro.noMacros";
	}
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
		errorReason.value = null;
	} catch (e) {
		if (e instanceof DirectoryNotFoundError) {
			// A missing directory is an expected, recoverable state (the macros dir may simply
			// not exist yet). Surface it inline via the panel alert instead of a transient toast
			// that the several refresh triggers would otherwise raise on every retry
			directory.value = target;
			filelist.value = [];
			errorReason.value = "missing";
		} else if (!(e instanceof DisconnectedError)) {
			console.warn(e);
			filelist.value = [];
			errorReason.value = "error";
		}
	}
	loading.value = false;
}

function refresh() {
	return loadDirectory(directory.value);
}

// Touch-only pull-to-refresh, gated to the mobile breakpoint so mouse-drag doesn't trigger it
async function onPullRefresh({ done }: { done: () => void }) {
	try {
		await refresh();
	} finally {
		done();
	}
}

async function itemClick(item: MacroItem) {
	if (uiStore.uiFrozen) {
		return;
	}
	if (item.isDirectory) {
		await loadDirectory(Path.combine(directory.value, item.name));
		return;
	}
	await runMacro(item);
}

async function runMacro(item: MacroItem | null) {
	if (!item || item.executing) {
		return;
	}
	item.executing = true;
	try {
		await machineStore.sendCode(`M98 P"${Path.escapeFilename(Path.combine(directory.value, item.name))}"`);
	} catch (e) {
		if (!(e instanceof DisconnectedError)) {
			console.warn(e);
		}
	}
	item.executing = false;
}

const contextMenu = reactive({ shown: false, x: 0, y: 0, item: null as MacroItem | null });

function openContextMenu(item: MacroItem, x: number, y: number) {
	contextMenu.item = item;
	contextMenu.x = x;
	contextMenu.y = y;
	// Toggle off first so an already-open menu repositions to the new target instead of staying put
	contextMenu.shown = false;
	nextTick(() => { contextMenu.shown = true; });
}

function editMacro(item: MacroItem | null) {
	if (item) {
		router.push(Path.editRoute(Path.combine(directory.value, item.name)));
	}
}

function openInExplorer(item: MacroItem | null) {
	if (item) {
		router.push(Path.explorerRoute(item.isDirectory ? Path.combine(directory.value, item.name) : directory.value));
	}
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
	directory.value = rootDirectory.value;
	if (machineStore.isConnected) {
		wasMounted = volumes.value.length > 0 && volumes.value[0].mounted;
		refresh();
	}
	Events.on("filesOrDirectoriesChanged", onFilesOrDirectoriesChanged);
});

onBeforeUnmount(() => {
	Events.off("filesOrDirectoriesChanged", onFilesOrDirectoriesChanged);
	if (rootChangeTimer !== undefined) {
		clearTimeout(rootChangeTimer);
	}
});

// Reacts to a firmware macros-directory change and to the user editing the start-directory
// setting. The setting updates on every keystroke, so debounce: a getFileList for each
// half-typed path would spam the connector and raise failed-listing notifications
let rootChangeTimer: number | undefined;
watch(rootDirectory, (to, from) => {
	if (rootChangeTimer !== undefined) {
		clearTimeout(rootChangeTimer);
	}
	rootChangeTimer = window.setTimeout(() => {
		rootChangeTimer = undefined;
		if (Path.equals(directory.value, from) || !Path.startsWith(directory.value, to)) {
			directory.value = to;
		}
		refresh();
	}, 400);
});

// Snap back to the root once directory browsing is turned off so the flat list always reflects it
watch(() => settings.value.showDirectories, (show) => {
	if (!show && !isRootDirectory.value) {
		loadDirectory(rootDirectory.value);
	}
});

watch(() => machineStore.isConnected, (connected) => {
	if (connected) {
		wasMounted = volumes.value.length > 0 && volumes.value[0].mounted;
		refresh();
	} else {
		directory.value = rootDirectory.value;
		filelist.value = [];
		errorReason.value = null;
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
