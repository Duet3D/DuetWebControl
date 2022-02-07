<style scoped>
.icon-thumbnail {
	height: 48px;
	width: 48px;
}
</style>

<template>
	<img :class="{ 'icon-thumbnail': icon }" :src="imgData" alt="thumbnail">
</template>

<script>
'use strict'

import QOI from 'qoijs'

import { ThumbnailFormat } from "@/store/machine/modelEnums";

export default {
	props: {
		icon: Boolean,
		thumbnail: {
			required: true,
			type: Object
		}
	},
	data() {
		return {
			imgData: ''
		}
	},
	methods: {
		async renderImage() {
			if (!this.thumbnail || !this.thumbnail.data) {
				this.imgData = '';
			} else if (this.thumbnail.format === ThumbnailFormat.qoi) {
				// Decode base64 input
				const base64Response = await fetch('data:application/octet-stream;base64,' + this.thumbnail.data);
				const buffer = await base64Response.arrayBuffer();
				const decodedImage = QOI.decode(buffer, null, null, 4);

				// Prepare context to draw to
				const canvas = document.createElement('canvas');
				canvas.width = decodedImage.width;
				canvas.height = decodedImage.height;
				const ctx = canvas.getContext('2d');

				// Draw the image content
				const imgData = ctx.createImageData(decodedImage.width, decodedImage.height);
				imgData.data.set(decodedImage.data);
				ctx.putImageData(imgData, 0, 0);

				// Save base64-encoded content
				this.imgData = canvas.toDataURL('image/png');
			} else if (this.thumbnail.format === ThumbnailFormat.png) {
				this.imgData = 'data:image/png;base64,' + this.thumbnail.data;
			}
		}
	},
	mounted() {
		this.renderImage();
	},
	watch: {
		thumbnail(to) {
			if (to) {
				this.renderImage();
			}
		},
		'thumbnail.data'() {
			this.renderImage();
		}
	}
}
</script>