<!-- Leading cell in the JobFileList's name column. Renders the gcode's small thumbnail with a
	 hover popover showing the largest available one; falls back to the generic file/folder
	 icon when no thumbnail has been parsed yet (or the file lacks one) -->
<template>
	<div class="job-thumbnail-cell">
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
		<v-icon v-else size="small" class="mr-2">
			{{ item.isDirectory ? "mdi-folder" : "mdi-file" }}
		</v-icon>
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
}>();

const thumbnails = computed<Array<ThumbnailInfo>>(() => props.item.thumbnails ?? []);

// Smallest thumbnail closest to 48px height for the row icon; largest one for the hover
// popover so users can preview the print without opening it
const smallThumbnail = computed<ThumbnailInfo | null>(() => {
	let best: ThumbnailInfo | null = null;
	for (const thumb of thumbnails.value) {
		if (!thumb.data) continue;
		if (!best || Math.abs(48 - thumb.height) < Math.abs(48 - best.height)) {
			best = thumb;
		}
	}
	return best;
});

const bigThumbnail = computed<ThumbnailInfo | null>(() => {
	let biggest: ThumbnailInfo | null = null;
	for (const thumb of thumbnails.value) {
		if (!thumb.data) continue;
		if (!biggest || thumb.height > biggest.height) {
			biggest = thumb;
		}
	}
	return biggest;
});
</script>

<style scoped>
.job-thumbnail-cell {
	display: flex;
	flex-shrink: 0;
	align-content: center;
	justify-content: center;
	width: 48px;
	margin-right: 8px;
}
</style>
