<style scoped>
.job-thumbnail-cell {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: flex-start;
	width: 48px;
	margin-right: 8px;
}

/* When the row has no thumbnail we fall back to the same small file/folder icon the Explorer
   uses; shrink the cell to that icon's intrinsic width so the trailing name aligns with
   non-thumbnail file lists instead of being pushed right by a 48px placeholder */
.job-thumbnail-cell--icon-only {
	width: auto;
}

.job-thumbnail-cell--tile {
	width: auto;
	margin-right: 0;
}
.job-thumbnail-cell__big {
	max-width: 100%;
	max-height: 160px;
}
</style>

<template>
	<div class="job-thumbnail-cell"
		 :class="{ 'job-thumbnail-cell--tile': tile, 'job-thumbnail-cell--icon-only': !tile && !smallThumbnail }">
		<template v-if="tile">
			<ThumbnailImg v-if="bigThumbnail" :thumbnail="bigThumbnail" class="job-thumbnail-cell__big" />
			<v-icon v-else size="64">
				{{ item.isDirectory ? "mdi-folder" : "mdi-file" }}
			</v-icon>
		</template>
		<template v-else>
			<v-menu v-if="smallThumbnail" open-on-hover open-on-focus :close-on-content-click="false"
					location="end" :min-width="16">
				<template #activator="{ props: activatorProps }">
					<div v-bind="activatorProps" tabindex="0" @click.stop>
						<ThumbnailImg :thumbnail="smallThumbnail" icon />
					</div>
				</template>
				<v-card class="d-flex">
					<ThumbnailImg :thumbnail="bigThumbnail" />
				</v-card>
			</v-menu>
			<v-icon v-else size="small">
				{{ item.isDirectory ? "mdi-folder" : "mdi-file" }}
			</v-icon>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { ThumbnailInfo } from "@duet3d/objectmodel";

import type { FileBrowserItem } from "@/composables/useFileBrowser";
import ThumbnailImg from "@/components/misc/ThumbnailImg.vue";

interface JobItem extends FileBrowserItem {
	thumbnails?: Array<ThumbnailInfo> | null;
}

const props = defineProps<{
	item: JobItem;
	tile?: boolean;
}>();

const thumbnails = computed<Array<ThumbnailInfo>>(() => props.item.thumbnails ?? []);

// Smallest thumbnail closest to 48px height for the row icon; largest one for the hover
// popover so users can preview the print without opening it
const smallThumbnail = computed<ThumbnailInfo | null>(() => {
	let best: ThumbnailInfo | null = null;
	for (const thumb of thumbnails.value) {
		if (!thumb.data) {
			continue;
		}
		if (!best || Math.abs(48 - thumb.height) < Math.abs(48 - best.height)) {
			best = thumb;
		}
	}
	return best;
});

const bigThumbnail = computed<ThumbnailInfo | null>(() => {
	let biggest: ThumbnailInfo | null = null;
	for (const thumb of thumbnails.value) {
		if (!thumb.data) {
			continue;
		}
		if (!biggest || thumb.height > biggest.height) {
			biggest = thumb;
		}
	}
	return biggest;
});
</script>
