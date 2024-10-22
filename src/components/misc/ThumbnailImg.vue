<style scoped>
.icon-thumbnail {
	height: 48px;
	width: 48px;
}
</style>

<template>
	<img :class="{ 'icon-thumbnail': icon }" :src="imgData" alt="thumbnail">
</template>

<script setup lang="ts">
import { ThumbnailFormat, ThumbnailInfo } from "@duet3d/objectmodel";
import QOI from "qoijs";

const props = defineProps<{
	icon?: boolean,
	thumbnail: ThumbnailInfo | null
}>();

const imgData = ref("");

let thumbnailData = "";

async function renderImage() {
	if (!props.thumbnail || !props.thumbnail.data) {
		imgData.value = thumbnailData = "";
	} else if (thumbnailData !== props.thumbnail.data) {
		if (props.thumbnail.format === ThumbnailFormat.jpeg) {
			imgData.value = "data:image/jpeg;base64," + props.thumbnail.data;
		} else if (props.thumbnail.format === ThumbnailFormat.png) {
			imgData.value = "data:image/png;base64," + props.thumbnail.data;
		} else if (props.thumbnail.format === ThumbnailFormat.qoi) {
			// Decode base64 input
			const base64Response = await fetch("data:application/octet-stream;base64," + props.thumbnail.data);
			const buffer = await base64Response.arrayBuffer();
			const decodedImage = QOI.decode(buffer, null, null, 4);

			// Prepare context to draw to
			const canvas = document.createElement("canvas");
			canvas.width = decodedImage.width;
			canvas.height = decodedImage.height;
			const ctx = canvas.getContext("2d");

			// Draw the image content
			if (ctx !== null) {
				const imgData = ctx.createImageData(decodedImage.width, decodedImage.height);
				imgData.data.set(decodedImage.data);
				ctx.putImageData(imgData, 0, 0);
			}

			// Save base64-encoded content
			imgData.value = canvas.toDataURL("image/png");
		}
		thumbnailData = props.thumbnail.data;
	}
}

renderImage();
watch(() => props.thumbnail, renderImage, { deep: true });
</script>