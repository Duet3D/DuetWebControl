import type { GCodeFileInfo, ThumbnailInfo } from "@duet3d/objectmodel";
import { ref } from "vue";

import type { FileBrowserItem } from "@/composables/useFileBrowser";
import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import Path from "@/utils/path";

/**
 * FileBrowserItem decorated with the slicer-emitted fields that getFileInfo provides. Consumers
 * read these to render thumbnails (the only one Explorer cares about) plus the Jobs-only extra
 * columns (height, filament, print time, ...)
 */
export interface GcodeThumbnailItem extends FileBrowserItem {
	height?: number | null;
	layerHeight?: number | null;
	numLayers?: number | null;
	filament?: Array<number> | null;
	printTime?: number | bigint | null;
	simulatedTime?: number | bigint | null;
	generatedBy?: string | null;
	thumbnails?: Array<ThumbnailInfo> | null;
	/**
	 * Slicer-specific extra fields (key/value), surfaced by the file-info dialog
	 */
	customInfo?: Record<string, unknown> | null;
}

/**
 * Per-row thumbnail + GCodeFileInfo fetcher shared by JobFileList and the Explorer. Each
 * `decorate(items, directory)` call seeds the items with empty metadata, then walks the gcode
 * files asynchronously, populating thumbnails and slicer fields as getFileInfo returns. A
 * fetch token short-circuits in-flight loops when a fresh decorate arrives or the host calls
 * `cancelInFlight()` (typically on deactivate/unmount)
 */
export function useGcodeThumbnails() {
	const machineStore = useMachineStore();
	const cacheStore = useCacheStore();

	let fetchToken = 0;
	const fileinfoProgress = ref(-1);
	const fileinfoTotal = ref(0);

	function cancelInFlight() {
		fetchToken++;
		fileinfoProgress.value = -1;
		fileinfoTotal.value = 0;
	}

	function clearCacheForDirectory(dir: string) {
		cacheStore.clearFileInfo(dir);
	}

	function seedMetadata(items: Array<FileBrowserItem>) {
		for (const item of items as Array<GcodeThumbnailItem>) {
			if (item.isDirectory) {
				continue;
			}
			item.height = null;
			item.layerHeight = null;
			item.numLayers = null;
			item.filament = null;
			item.printTime = null;
			item.simulatedTime = null;
			item.generatedBy = null;
			item.thumbnails = null;
			item.customInfo = null;
		}
	}

	function applyInfo(item: GcodeThumbnailItem, info: GCodeFileInfo) {
		item.height = info.height ?? null;
		item.layerHeight = info.layerHeight ?? null;
		item.numLayers = info.numLayers ?? null;
		item.filament = (info.filament && info.filament.length > 0) ? info.filament : null;
		item.printTime = info.printTime ?? null;
		item.simulatedTime = info.simulatedTime ?? null;
		item.generatedBy = info.generatedBy ?? null;
		item.thumbnails = Array.from(info.thumbnails ?? []);
		// customInfo is a ModelDictionary (a Map subclass); flatten it to a plain object
		item.customInfo = (info.customInfo && info.customInfo.size > 0)
			? Object.fromEntries(info.customInfo)
			: null;
	}

	// Slicer fileinfo (thumbnails, print time, height, ...) only exists for sliced print jobs.
	// Those live in the gcodes tree on the system volume or anywhere on an external volume; other
	// system-volume areas (/sys, /macros, /filaments, ...) hold gcode macros that share the .g
	// extension but carry no such metadata, so an M36 sweep there is pure waste
	function isJobDirectory(directory: string): boolean {
		const gCodes = machineStore.model.directories.gCodes;
		return Path.startsWith(directory, gCodes) || Path.getVolume(directory) !== Path.getVolume(gCodes);
	}

	async function fetchAllInfos(items: Array<FileBrowserItem>, token: number, directorySnapshot: string) {
		const gcodeFiles = isJobDirectory(directorySnapshot)
			? (items as Array<GcodeThumbnailItem>).filter(
				(item) => !item.isDirectory && Path.isGCodePath(item.name, machineStore.model.directories.gCodes)
			)
			: [];
		if (gcodeFiles.length === 0) {
			fileinfoProgress.value = -1;
			fileinfoTotal.value = 0;
			return;
		}

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

			// Re-check after the await: cancelInFlight may have run while we were suspended and
			// reset progress/total. Touching them again here would leave the progress bar stuck
			// in the indeterminate "progress > -1, total = 0" state
			if (token !== fetchToken) {
				break;
			}
			if (info) {
				applyInfo(item, info);
			}
			fileinfoProgress.value = i + 1;
		}

		if (token === fetchToken) {
			fileinfoProgress.value = -1;
			fileinfoTotal.value = 0;
		}
	}

	function decorate(items: Array<FileBrowserItem>, directorySnapshot: string) {
		seedMetadata(items);
		const token = ++fetchToken;
		fetchAllInfos(items, token, directorySnapshot);
	}

	return {
		decorate,
		cancelInFlight,
		clearCacheForDirectory,
		fileinfoProgress,
		fileinfoTotal,
	};
}
