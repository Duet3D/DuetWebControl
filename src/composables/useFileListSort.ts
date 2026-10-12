import { computed, type MaybeRefOrGetter, toValue } from "vue";

import type { FileBrowserItem } from "@/composables/useFileBrowser";
import { useCacheStore } from "@/stores/cache";

/**
 * Sort state of a file list: the column key plus its direction
 */
export interface FileListSortEntry {
	key: string;
	order: "asc" | "desc";
}

// Per-mode default sort: jobs open with the most recently uploaded slice at the top, everything
// else alphabetically
const DEFAULT_SORTS: Record<string, FileListSortEntry> = {
	jobs: { key: "lastModified", order: "desc" }
};

/**
 * Sort state shared by every file list of the same mode, persisted in the cache store so a column
 * choice survives navigation. Besides the rendering itself, the background fileinfo fetcher reads
 * it to walk the files in the order they are displayed
 * @param mode FileList mode the sort state belongs to (`jobs`, `files`, `macros`, ...)
 */
export function useFileListSort(mode: MaybeRefOrGetter<string>) {
	const cacheStore = useCacheStore();

	const entry = computed<FileListSortEntry>(() => cacheStore.sorting[toValue(mode)]
		?? DEFAULT_SORTS[toValue(mode)]
		?? { key: "name", order: "asc" });

	const sortKey = computed(() => entry.value.key);
	const sortOrder = computed(() => entry.value.order);

	function setSort(key: string, order: "asc" | "desc") {
		cacheStore.sorting[toValue(mode)] = { key, order };
	}

	/**
	 * Sort by {@link key}, flipping the direction when it is already the active column
	 * @param key Column key to sort by
	 */
	function toggleSort(key: string) {
		setSort(key, (key === sortKey.value && sortOrder.value === "asc") ? "desc" : "asc");
	}

	/**
	 * Apply the active sort to a copy of {@link items}. Directories always cluster at the top
	 * regardless of the sort order
	 * @param items Items to sort
	 * @returns Sorted copy of the items
	 */
	function sortItems<T extends FileBrowserItem>(items: Array<T>): Array<T> {
		const factor = sortOrder.value === "asc" ? 1 : -1;
		return [...items].sort((a, b) => {
			if (a.isDirectory !== b.isDirectory) {
				return a.isDirectory ? -1 : 1;
			}
			return compareSortValues(a, b, sortKey.value) * factor;
		});
	}

	return {
		sortKey,
		sortOrder,
		setSort,
		toggleSort,
		sortItems
	};
}

function compareSortValues(a: FileBrowserItem, b: FileBrowserItem, key: string): number {
	const va = (a as Record<string, unknown>)[key];
	const vb = (b as Record<string, unknown>)[key];
	if (va === undefined || va === null) {
		return vb === undefined || vb === null ? 0 : -1;
	}
	if (vb === undefined || vb === null) {
		return 1;
	}
	if (typeof va === "number" && typeof vb === "number") {
		return va - vb;
	}
	if (typeof va === "bigint" && typeof vb === "bigint") {
		return va < vb ? -1 : va > vb ? 1 : 0;
	}
	if (va instanceof Date && vb instanceof Date) {
		return va.getTime() - vb.getTime();
	}
	if (Array.isArray(va) && Array.isArray(vb)) {
		const ta = va.reduce<number>((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
		const tb = vb.reduce<number>((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
		return ta - tb;
	}
	return String(va).localeCompare(String(vb), undefined, { sensitivity: "base", numeric: true });
}
