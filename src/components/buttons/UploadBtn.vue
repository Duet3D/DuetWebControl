<template>
	<div>
		<v-btn v-bind="$props" @click="chooseFile" :disabled="$props.disabled || !canUpload" :loading="uploading" :title="$t(`button.upload['${target}'].title`)"
			:color="innerColor" @dragover="dragOver" @dragleave="dragLeave" @drop.prevent.stop="dragDrop">
			<v-icon class="mr-2">cloud_upload</v-icon> {{ $t(`button.upload['${target}'].caption`) }}
		</v-btn>
		<input ref="fileInput" type="file" :accept="accept" hidden @change="fileSelected" multiple />
	</div>
</template>

<script>
'use strict'

import VBtn from 'vuetify/es5/components/VBtn'

import { mapGetters, mapActions } from 'vuex'
import Path from '../../utils/path.js'

export default {
	computed: {
		...mapGetters({
			isConnected: 'isConnected',
			frozen: 'ui/frozen'
		}),
		canUpload() {
			return this.isConnected && !this.frozen;
		},
		accept() {
			switch (this.target) {
				case 'gcodes': return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap';
				case 'start': return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap';
				case 'macros': return '.g,.gcode,.gc,.gco,.nc,.ngc';
				case 'filaments': return '.zip';
				case 'sys': return '.zip,.g,.csv';
				case 'www': return '.zip,.csv,.g,.json,.htm,.html,.ico,.xml,.css,.map,.js,.ttf,.eot,.svg,.woff,.woff2,.jpeg,.jpg,.png,.gz';
				case 'update': return '.zip,.bin';
			}
		},
		destinationDirectory() {
			if (this.directory) {
				return this.directory;
			}

			switch (this.target) {
				case 'gcodes': return Path.gcodes;
				case 'start': return Path.gcodes;
				case 'macros': return Path.macros;
				case 'filaments': return Path.filaments;
				case 'sys': return Path.sys;
				case 'www': return Path.www;
				case 'update': return Path.sys;
			}
		}
	},
	data() {
		return {
			innerColor: this.color,
			uploading: false
		}
	},
	extends: VBtn,
	props: {
		directory: String,
		target: {
			type: String,
			required: true
		},
		uploadPrint: Boolean
	},
	methods: {
		...mapActions(['sendCode', 'upload']),
		chooseFile() {
			if (!this.uploading) {
				this.$refs.fileInput.click();
			}
		},
		async fileSelected(e) {
			await this.doUpload(e.target.files);
			this.$refs.fileInput.value = "";
		},
		async doUpload(files) {
			if (this.type === 'start' && files.length !== 1) {
				this.$makeNotification('error', this.$t(`button.upload['${this.target}'].caption`), this.$t('error.uploadStartWrongFileCount'));
			}

			this.uploading = true;
			for (let i = 0; i < files.length; i++) {
				const content = files[i], filename = Path.combine(this.destinationDirectory, files[i].name);
				try {
					// Upload a file
					await this.upload({ filename, content });

					// Run it (if required)
					if (this.target === 'start') {
						await this.sendCode(`M32 "${filename}"`);
					}
				} catch (e) {
					this.$emit('uploadFailed', { filename, reason: e });
					break;
				}
			}
			this.uploading = false;
		},
		dragOver(e) {
			if (e.dataTransfer.files.length) {
				e.preventDefault();
				e.stopPropagation();
				this.innerColor = 'success';
			}
		},
		dragLeave(e) {
			if (e.dataTransfer.files.length) {
				e.preventDefault();
				e.stopPropagation();
				this.innerColor = this.color;
			}
		},
		async dragDrop(e) {
			this.innerColor = this.color;
			await this.doUpload(e.dataTransfer.files);
		}
	}
}
</script>
