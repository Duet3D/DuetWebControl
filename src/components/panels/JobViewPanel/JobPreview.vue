<style scoped>
.preview-wrapper {
	position: relative;
	overflow: hidden;
}

/* Scale to fill the panel while preserving aspect; absolutely positioned so the image never drives
   the panel height (it comes from the surrounding flex column) and so it cannot overflow it */
.preview-image {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	object-fit: contain;
}

/* Translucent fill over the not-yet-printed portion; it recedes upward as the print progresses, so
   the preview is revealed from the bottom up as the job builds */
.progress-overlay {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	pointer-events: none;
	background: linear-gradient(to bottom, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.2));
	transition: height 0.3s ease;
}
</style>

<template>
	<div class="preview-wrapper flex-grow-1">
		<ThumbnailImg v-if="thumbnail" :thumbnail="thumbnail" class="preview-image" />
		<div v-if="thumbnail && settings.showProgressOverlay" class="progress-overlay"
			 :style="{ height: `${overlayHeight}%` }" />
	</div>
</template>

<script lang="ts">
export interface PreviewSettings {
	// Overlay a translucent fill on the preview that rises as the print progresses
	showProgressOverlay: boolean;
}

export const previewDefaults: PreviewSettings = {
	showProgressOverlay: true,
};
</script>

<script setup lang="ts">
import { ThumbnailInfo } from "@duet3d/objectmodel";

import ThumbnailImg from "@/components/misc/ThumbnailImg.vue";
import { useMachineStore } from "@/stores/machine";

defineProps<{ settings: PreviewSettings }>();

const machineStore = useMachineStore();

// Largest thumbnail carrying data - the slicer emits several sizes and the biggest reads best at panel size
const thumbnail = computed<ThumbnailInfo | null>(() => {
	const file = machineStore.model.job.file;
	if (file === null) {
		return null;
	}
	const withData = file.thumbnails.filter(item => !!item.data);
	if (withData.length === 0) {
		return null;
	}
	return withData.slice().sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
});

// Height of the overlay = the share still to print, so it shrinks toward the top as printing advances
const overlayHeight = computed(() => (1 - machineStore.jobProgress) * 100);
</script>
