<route lang="json">
{
	"meta": {
		"pageFill": true,
		"menu": {
			"category": "files",
			"icon": "mdi-play",
			"caption": "menu.files.jobs",
			"order": 10,
			"path": "/Jobs"
		}
	}
}
</route>

<style scoped>
/* The wrapping `.jobs-page` div is `.dwc-page-fill` so the v-card inside picks up the same
   viewport-fill behavior as the Explorer. Pull the FileList's card to 100% of that wrapper
   so it actually fills, and let the empty-state shrink kick in when the list has nothing
   to show + the machine is disconnected */
.jobs-page :deep(.file-list-card) {
	height: 100%;
}
.jobs-page :deep(.file-list-card.file-list-card--empty) {
	height: auto;
}
</style>

<template>
	<div class="jobs-page dwc-page-fill">
		<JobFileList :key="selectedVolume" v-model:directory="currentDirectory"
					 :options="browserOptions" :root-directory="gcodesDirectory"
					 :root-label="$t('list.jobs.root')" no-items-text="list.jobs.noJobs" no-new-file
					 @file-click="confirmStartJob"
					 @file-edit="openInEditor" @file-simulate="simulateJob">
			<template v-if="volumeOptions.length > 1" #actions>
				<v-menu>
					<template #activator="{ props: activatorProps }">
						<v-btn v-bind="activatorProps" variant="text" icon :title="$t('list.jobs.volume')">
							<v-icon>mdi-sd</v-icon>
						</v-btn>
					</template>
					<v-list :density="controlDensity">
						<v-list-item v-for="opt in volumeOptions" :key="opt.value"
									 :active="selectedVolume === opt.value" :title="opt.label"
									 @click="selectVolume(opt.value)" />
					</v-list>
				</v-menu>
			</template>
		</JobFileList>
	</div>
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
import { showConfirmDialog } from "@/composables/useConfirmDialog";
import { useLargeButtons } from "@/composables/useLargeButtons";
import i18n from "@/i18n";
import { useCacheStore } from "@/stores/cache";
import Path from "@/utils/path";

const machineStore = useMachineStore();
const cacheStore = useCacheStore();
const { controlDensity } = useLargeButtons();
const router = useRouter();
const route = useRoute("/Jobs/[[volume]]/[[...path]]");
const { data: initialFiles } = useJobsListing();

// #region Route <-> state mapping
// Route shape: `/Jobs[/<volume>][/<...path>]`. The first segment is interpreted as a numeric
// volume when it parses as a positive integer; anything else is folded into the path under the
// default volume. That lets the URL stay clean for the default volume (e.g. `/Jobs/myfolder`)
// while still supporting explicit selection for secondary volumes (`/Jobs/1/myfolder`)
function defaultVolumeIndex(): number {
	return Path.getVolume(machineStore.model.directories.gCodes);
}

// The default volume keeps its full configured gCodes path (e.g. "0:/gcodes") so users see the
// real machine-side root; secondary volumes are simply that volume's filesystem root
function gcodesRootForVolume(volume: number): string {
	return volume === defaultVolumeIndex()
		? machineStore.model.directories.gCodes
		: Path.volumeRoot(volume);
}

function parseRouteParams(): { volume: number; segments: Array<string> } {
	const volumeRaw = route.params.volume ?? "";
	// vue-router's `:path*` catch-all returns an array of segments. The optional `[[...path]]`
	// produces `string[]` when populated, `undefined` when bare - normalise to a flat list of
	// strings so Path.combine (which expects strings) doesn't get an array as a positional arg
	const rawPath = route.params.path;
	const pathSegments = Array.isArray(rawPath)
		? rawPath
		: rawPath ? [rawPath] : [];
	if (/^\d+$/.test(volumeRaw)) {
		return { volume: Number(volumeRaw), segments: pathSegments };
	}
	const segments = volumeRaw.length > 0 ? [volumeRaw, ...pathSegments] : pathSegments;
	return { volume: defaultVolumeIndex(), segments };
}

const selectedVolume = ref<number>(0);
const currentDirectory = ref<string>("");

// The default layout keeps this component alive across route changes (router-view + keep-alive),
// so plain route watchers fire even after the user has navigated to a different page entirely
// Guard each watcher with this check so we only react while the active route still belongs to
// the Jobs page; otherwise navigating Jobs -> Macros would have the kept-alive Jobs page
// immediately push the URL back to /Jobs
function isOnJobsRoute(): boolean {
	return route.path === "/Jobs" || route.path.startsWith("/Jobs/");
}

function applyRouteToState() {
	const { volume, segments } = parseRouteParams();
	const root = gcodesRootForVolume(volume);
	selectedVolume.value = volume;
	currentDirectory.value = segments.length > 0
		? Path.combine(root, ...segments)
		: root;
}

// Seed state from the URL on mount and react to back/forward navigation
applyRouteToState();

// Opened bare (`/Jobs`, e.g. from the menu)? Restore the last browsed directory from the cache.
// Setting currentDirectory triggers the watcher below, which mirrors it back into the URL
if (route.path === "/Jobs" && cacheStore.lastJobDirectory) {
	selectedVolume.value = Path.getVolume(cacheStore.lastJobDirectory);
	currentDirectory.value = cacheStore.lastJobDirectory;
}

watch(() => [route.params.volume, route.params.path], () => {
	if (!isOnJobsRoute()) {
		return;
	}
	applyRouteToState();
});

function pushUrl(volume: number, directory: string, replace = false) {
	const root = gcodesRootForVolume(volume);
	const rel = Path.startsWith(directory, root)
		? directory.slice(root.length).replace(/^\/+/, "")
		: "";
	// Build the absolute path directly: name-based router.resolve was producing runaway URLs
	// (forward-history each appended another path segment) because the unplugin-vue-router-
	// generated route name doesn't round-trip cleanly when serialised via `as string`
	let nextPath = "/Jobs";
	if (volume !== defaultVolumeIndex()) {
		nextPath += `/${volume}`;
	}
	if (rel.length > 0) {
		nextPath += "/" + rel.split("/").filter(Boolean).map(encodeURIComponent).join("/");
	}
	if (nextPath === route.fullPath) {
		return;
	}
	if (replace) {
		router.replace(nextPath);
	} else {
		router.push(nextPath);
	}
}

// Mirror in-page navigation back into the URL via router.push so the browser back-button gets
// a history entry per subdirectory. Guarded by isOnJobsRoute() so the kept-alive component
// doesn't push back to /Jobs while the user has navigated elsewhere
watch(currentDirectory, (dir) => {
	if (!dir || !isOnJobsRoute()) {
		return;
	}
	cacheStore.lastJobDirectory = dir;
	pushUrl(selectedVolume.value, dir);
});

function selectVolume(volume: number) {
	if (volume === selectedVolume.value) {
		return;
	}
	selectedVolume.value = volume;
	currentDirectory.value = gcodesRootForVolume(volume);
}
// #endregion

const volumeOptions = computed<Array<{ value: number; label: string }>>(() => {
	const volumes = machineStore.model.volumes ?? [];
	if (volumes.length === 0) {
		return [{ value: 0, label: "0:/" }];
	}
	return volumes
		.map((vol, idx) => ({ vol, idx }))
		.filter(({ vol }) => vol?.mounted)
		.map(({ vol, idx }) => ({
			value: idx,
			label: vol?.name || `${idx}:/`,
		}));
});

const gcodesDirectory = computed(() => gcodesRootForVolume(selectedVolume.value));

const browserOptions = computed(() => ({
	initialDirectory: currentDirectory.value || gcodesDirectory.value,
	initialFiles: currentDirectory.value === machineStore.model.directories.gCodes
		? ((initialFiles.value ?? []) as Array<FileBrowserItem>)
		: [],
}));

async function confirmStartJob(item: FileBrowserItem, directory: string) {
	if (await showConfirmDialog(i18n.global.t("dialog.startJob.title", [item.name]), i18n.global.t("dialog.startJob.prompt", [item.name]), "mdi-play")) {
		await machineStore.sendCode(`M32 "${Path.escapeFilename(Path.combine(directory, item.name))}"`);
	}
}

// Edit opens the file in the Explorer's Monaco editor; the `edit` prefix marks it as a file route
function openInEditor(item: FileBrowserItem, directory: string) {
	router.push(Path.editRoute(Path.combine(directory, item.name)));
}

// Simulate runs an out-of-process print simulation via M37. The board reports back when done; the
// browser stays free in the meantime
async function simulateJob(item: FileBrowserItem, directory: string) {
	const fullPath = Path.combine(directory, item.name);
	await machineStore.sendCode(`M37 P"${Path.escapeFilename(fullPath)}"`);
}
</script>
