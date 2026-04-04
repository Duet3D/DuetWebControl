import { FileListItem, DisconnectedError } from "@duet3d/connectors";
import { Volume } from "@duet3d/objectmodel";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { LogLevel, useUiStore } from "@/stores/ui";
import { getErrorMessage } from "@/utils/errors";
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
	 * Optional hook to enrich items before they enter the list (e.g. set displayName, executing flags)
	 */
	decorate?: (items: Array<FileBrowserItem>) => void;
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
	let wasMounted = false;

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
			options.decorate?.(files);
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

	function navigateInto(name: string) {
		return loadDirectory(Path.combine(directory.value, name));
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
		if (machineStore.isConnected) {
			wasMounted = volumes.value.length > 0 && volumes.value[0].mounted;
			refresh();
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
		loadDirectory,
		refresh,
		navigateInto,
		goUp,
	};
}
