<style scoped>
canvas {
	height: 100%;
	width: 100%;
	outline: none;
}
</style>

<template>
	<div class="mt-3" v-resize="resize">
		<canvas ref="preview"></canvas>
	</div>
</template>

<script>
'use strict'

import { mapState, mapActions } from 'vuex'
import { WebGLPreview } from 'gcode-preview'
import { Color } from 'three'

export default {
	computed: {
		...mapState('machine/model', {
			jobFile: state => state.job.file.fileName,
			filePosition: state => state.job.filePosition,
			fileSize: state => state.job.file.size
		})
	},
	data() {
		return {
			active: true,
			fileName: null,
			fileContent: null,
			lastFilePosition: 0,
			preview: null
		}
	},
	methods: {
		...mapActions('machine', ['download']),
		async loadCurrentFile() {
			if (this.jobFile) {
				await this.loadFile(this.jobFile);
			}
		},
		async loadFile(file) {
			this.fileName = file;
			this.fileContent = await this.download({ filename: file, type: 'text' });
			this.preview.clear();
			if (file === this.jobFile) {
				if (this.filePosition) {
					this.preview.processGCode(this.fileContent.substring(0, this.filePosition));
					this.lastFilePosition = this.filePosition;
				} else {
					this.lastFilePosition = 0;
				}
			} else {
				this.preview.processGCode(this.fileContent);
				this.lastFilePosition = 0;
			}
		},
		resize() {
			if (this.preview) {
				this.preview.resize();
			}
		}
	},
	mounted() {
		this.preview = new WebGLPreview({
			canvas: this.$refs.preview,
			limit: Infinity,
			topLayerColor: new Color('lime').getHex(),
			lastSegmentColor: new Color('red').getHex()
		});

		this.loadCurrentFile();
	},
	activated() {
		if (this.active && this.fileContent) {
			this.preview.processGCode(this.fileContent.substring(this.lastFilePosition, this.filePosition));
			this.lastFilePosition = this.filePosition;
		}
		this.active = true;
	},
	deactivated() {
		this.active = false;
	},
	watch: {
		filePosition(to) {
			if (this.active && this.jobFile === this.fileName && to > 0) {
				if (this.fileContent) {
					this.preview.processGCode(this.fileContent.substring(this.lastFilePosition, to));
				}
				this.lastFilePosition = to;
			}
		},
		jobFile() {
			this.loadCurrentFile();
		}
	}
}
</script>
