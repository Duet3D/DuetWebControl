import { FileListItem, DirectoryNotFoundError, DisconnectedError } from "@duet3d/connectors";
import { Volume } from "@duet3d/objectmodel";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import Events from "@/utils/events";
import Path from "@/utils/path";

/**
 * Display-augmented {@link FileListItem} that callers may extend further
 */
export interface FileBrowserItem extends FileListItem {
	[key: string]: any;
}

export interface FileBrowserOptions {
	/**
	 * Initial directory to display. Updates as the user navigates
	 */
	initialDirectory: string;
	/**
	 * Optional hook to enrich items before they enter the list (e.g. set displayName, executing flags).
	 * The directory the items belong to is passed alongside so async decorators don't have to recover
	 * it from a separate reactive ref that may not have settled by the time decorate runs
	 */
	decorate?: (items: Array<FileBrowserItem>, directory: string) => void;
	/**
	 * Pre-fetched listing for {@link initialDirectory}. When provided, the on-mount refresh is
	 * skipped and the browser starts with this data; useful when a route data loader has already
	 * fetched the directory before the component mounts. Subsequent navigation still re-fetches
	 */
	initialFiles?: Array<FileBrowserItem>;
}

/**
 * Shared file-browser state: current directory, file list, loading flag, refresh handlers tied to
 * the file-event bus, and helpers for navigation. Each call returns its own scope - composing more
 * than one in a single component is supported and gives independent state per call site
 */
export function useFileBrowser(options: FileBrowserOptions) {
	const machineStore = useMachineStore();
	const uiStore = useUiStore();

	const directory = ref(options.initialDirectory);
	const filelist = ref<Array<FileBrowserItem>>([]);
	const loading = ref(false);
	// Sticky reason for the last failed load - null on success (the list may still be empty, that
	// just isn't an error), "missing" for a 404 from the connector, "error" for anything else
	// Consumers branch their no-data alert text/severity on this instead of always showing the
	// generic "no files" copy when the directory simply doesn't exist or the fetch blew up
	const errorReason = ref<"missing" | "error" | null>(null);
	let wasMounted = false;

	// One-shot guard: if the caller seeded us with pre-fetched data (typically from a route
	// data loader), use it for the initial render and skip the on-mount fetch. Subsequent
	// navigation still goes through loadDirectory normally
	let initialFilesConsumed = false;
	if (options.initialFiles && options.initialFiles.length > 0) {
		// Assign before decorating so the decorator gets the reactive proxy - see loadDirectory
		filelist.value = options.initialFiles.slice();
		options.decorate?.(filelist.value, options.initialDirectory);
	}

	const volumes = computed<Array<Volume>>(() => machineStore.model.volumes);

	async function loadDirectory(target: string) {
		if (loading.value) {
			return;
		}
		loading.value = true;
		try {
			const files = (await machineStore.getFileList(target)) as Array<FileBrowserItem>;
			// Stable order: directories first, then case-insensitive name within each group
			files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
			files.sort((a, b) => (a.isDirectory === b.isDirectory) ? 0 : (a.isDirectory ? -1 : 1));
			// Assign first so filelist.value wraps `files` in a reactive proxy, then hand the
			// PROXY (not the raw array) to decorate. Decorators that later mutate items
			// asynchronously - JobFileList's per-file fileinfo fetch is the live example - need
			// to write through the proxy or Vue 3 will silently drop the updates (Vue 2's
			// defineProperty-based reactivity tracked the original target; Vue 3's Proxy doesn't)
			directory.value = target;
			filelist.value = files;
			errorReason.value = null;
			options.decorate?.(filelist.value, target);
		} catch (e) {
			if (e instanceof DirectoryNotFoundError) {
				// Surface a missing directory inline instead of as a transient error toast - the
				// alert in the file list already conveys it more clearly than a snackbar that
				// vanishes after a few seconds
				directory.value = target;
				filelist.value = [];
				errorReason.value = "missing";
			} else if (!(e instanceof DisconnectedError)) {
				console.warn(e);
				uiStore.notifyError(e, i18n.global.t("error.filelistRequestFailed"));
				errorReason.value = "error";
			}
		} finally {
			// finally so the early-return `if (loading.value) return;` at the top can't leave the
			// browser stuck after a disconnect mid-fetch - the connection-drop watcher below also
			// resets it defensively, but a try/finally keeps the normal path single-source-of-truth
			loading.value = false;
		}
	}

	function refresh() {
		return loadDirectory(directory.value);
	}

	function navigateInto(name: string) {
		return loadDirectory(Path.combine(directory.value, name));
	}

	function goUp() {
		return loadDirectory(Path.extractDirectory(directory.value));
	}

	// During a multi-file transfer the connector fires a volume-changed event per written file
	// (standalone polls RRF's per-volume change sequence), which would reload the list on every
	// file. Defer to a single refresh once the transfer finishes
	let refreshPending = false;

	function onFilesOrDirectoriesChanged(payload: { files?: Array<string>; volume?: number }) {
		const affectsDirectory = (payload.files !== undefined && Path.filesAffectDirectory(payload.files, directory.value))
			|| payload.volume === Path.getVolume(directory.value);
		if (!affectsDirectory) {
			return;
		}
		if (machineStore.changingMultipleFiles) {
			refreshPending = true;
			return;
		}
		refreshPending = false;
		refresh();
	}

	onMounted(() => {
		if (machineStore.isConnected) {
			wasMounted = volumes.value.length > 0 && volumes.value[0].mounted;
			if (options.initialFiles && !initialFilesConsumed) {
				// Pre-fetched data already populated filelist; skip the on-mount refresh
				initialFilesConsumed = true;
			} else {
				refresh();
			}
		}
		Events.on("filesOrDirectoriesChanged", onFilesOrDirectoriesChanged);
	});

	onBeforeUnmount(() => {
		Events.off("filesOrDirectoriesChanged", onFilesOrDirectoriesChanged);
	});

	watch(() => machineStore.isConnected, (connected) => {
		if (connected) {
			wasMounted = volumes.value.length > 0 && volumes.value[0].mounted;
			refresh();
		} else {
			filelist.value = [];
			// If we disconnected while a fetch was in-flight, the awaited promise from the
			// connector may never settle (and therefore the finally in loadDirectory may never
			// fire). Clear the flag here so a subsequent reconnect can re-enter loadDirectory
			// instead of being short-circuited by the "already loading" guard
			loading.value = false;
		}
	});

	// Run the single refresh that was deferred during a multi-file transfer once it ends. upload()
	// flips this flag false and then emits a final files event; if that already refreshed us the
	// flag is cleared, so this only fires for transfers that produced no covering files event
	watch(() => machineStore.changingMultipleFiles, (changing) => {
		if (!changing && refreshPending) {
			refreshPending = false;
			refresh();
		}
	});

	// Wait for the SD volume to come back online after an unmount; the connector silently returns nothing
	// while unmounted, so a refresh now would just clear the list
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

	return {
		directory,
		filelist,
		loading,
		errorReason,
		loadDirectory,
		refresh,
		navigateInto,
		goUp,
	};
}
