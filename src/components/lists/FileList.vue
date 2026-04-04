<!-- Minimal file-browser table. Toolbar shows the current path with click-to-navigate breadcrumbs and a
	 refresh button; the body is a v-data-table sorted by directory-first then user-chosen column.
	 Multi-select, drag/drop, context menus and rename/delete are not implemented yet - the list is
	 read-only until the Explorer route grows those features in a follow-up commit -->
<template>
	<v-card>
		<v-toolbar density="compact" color="surface" class="px-2">
			<v-btn v-show="canGoUp" icon variant="text" :title="$t('list.baseFileList.goUp')"
				   @click="browser.goUp()">
				<v-icon>mdi-arrow-up</v-icon>
			</v-btn>

			<v-breadcrumbs :items="breadcrumbItems" density="compact" class="pa-0">
				<template #divider>
					<v-icon size="small">mdi-chevron-right</v-icon>
				</template>
				<template #item="{ item }">
					<a v-if="item.href" href="javascript:void(0)" class="text-body-2"
					   @click.prevent="browser.loadDirectory(item.href)">
						{{ item.title }}
					</a>
					<span v-else class="text-body-2">{{ item.title }}</span>
				</template>
			</v-breadcrumbs>

			<v-spacer />

			<v-btn variant="text" :loading="browser.loading.value" :disabled="uiStore.uiFrozen"
				   :title="$t('button.refresh.caption')" @click="browser.refresh()">
				<v-icon>mdi-refresh</v-icon>
			</v-btn>
		</v-toolbar>

		<v-data-table :headers="effectiveHeaders" :items="browser.filelist.value" item-value="name"
					  :loading="browser.loading.value" :sort-by="internalSortBy" must-sort
					  hide-default-footer items-per-page="-1" density="compact" :no-data-text="$t(noItemsText)"
					  @click:row="onRowClick">
			<template #item.name="{ item }">
				<div class="d-flex align-center">
					<v-icon size="small" class="mr-2">
						{{ item.isDirectory ? "mdi-folder" : "mdi-file" }}
					</v-icon>
					{{ item.name }}
				</div>
			</template>
			<template #item.size="{ item }">
				{{ item.isDirectory ? "" : displaySize(typeof item.size === "bigint" ? Number(item.size) : item.size) }}
			</template>
			<template #item.lastModified="{ item }">
				{{ item.lastModified ? item.lastModified.toLocaleString() : $t("generic.noValue") }}
			</template>
		</v-data-table>
	</v-card>
</template>

<script setup lang="ts">
import type { FileBrowserItem, FileBrowserOptions } from "@/composables/useFileBrowser";
import { useFileBrowser } from "@/composables/useFileBrowser";
import { useUiStore } from "@/stores/ui";
import { displaySize } from "@/utils/display";
import Path from "@/utils/path";

interface FileListHeader {
	title: string;
	key: string;
}

const props = defineProps<{
	options: FileBrowserOptions;
	/**
	 * Root directory the breadcrumb shows as "the volume" - clicking it jumps back to this folder
	 */
	rootDirectory: string;
	/**
	 * Display label for the root directory (e.g. "Root")
	 */
	rootLabel: string;
	/**
	 * Extra columns to add after Name, Size, Last Modified
	 */
	extraHeaders?: Array<FileListHeader>;
	noItemsText: string;
}>();

const emit = defineEmits<{
	fileClick: [item: FileBrowserItem];
}>();

const uiStore = useUiStore();
const browser = useFileBrowser(props.options);

const defaultHeaders: Array<FileListHeader> = [
	{ title: "Name", key: "name" },
	{ title: "Size", key: "size" },
	{ title: "Last Modified", key: "lastModified" },
];

const effectiveHeaders = computed(() => [...defaultHeaders, ...(props.extraHeaders ?? [])]);
const internalSortBy = ref([{ key: "name", order: "asc" as const }]);

const canGoUp = computed(() => !Path.equals(browser.directory.value, props.rootDirectory)
	&& Path.startsWith(browser.directory.value, props.rootDirectory));

// Build breadcrumb trail back to the root; each segment links to its own loadDirectory call
const breadcrumbItems = computed(() => {
	const items: Array<{ title: string; href?: string }> = [];
	const root = props.rootDirectory;
	const isAtRoot = Path.equals(browser.directory.value, root);
	items.push({ title: props.rootLabel, href: isAtRoot ? undefined : root });

	if (Path.startsWith(browser.directory.value, root)) {
		const remainder = browser.directory.value.substring(root.length).replace(/^\/+/, "");
		if (remainder.length > 0) {
			const parts = remainder.split("/");
			let accumulated = root;
			parts.forEach((part, index) => {
				accumulated = Path.combine(accumulated, part);
				const last = index === parts.length - 1;
				items.push({ title: part, href: last ? undefined : accumulated });
			});
		}
	}
	return items;
});

function onRowClick(_event: unknown, payload: { item: FileBrowserItem }) {
	const item = payload.item;
	if (item.isDirectory) {
		browser.navigateInto(item.name);
		return;
	}
	emit("fileClick", item);
}
</script>
