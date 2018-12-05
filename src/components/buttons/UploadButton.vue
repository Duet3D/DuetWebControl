<template>
	<div>
		<v-btn @click="chooseFile" :disabled="!canUpload" :loading="uploading" :title="$t(`button.upload['${target}'].title`)"
			:color="color" @dragover.prevent.stop="dragOver" @dragleave.prevent.stop="dragLeave" @drop.prevent.stop="dragDrop">
			<v-icon class="mr-2">cloud_upload</v-icon> {{ $t(`button.upload['${target}'].caption`) }}
		</v-btn>
		<input ref="fileInput" type="file" :accept="accept" hidden @change="fileSelected" multiple />
	</div>
</template>

<script>
'use strict'

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
				case 'gcode': return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap';
				case 'gcodeStart': return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap';
				case 'macro': return '.g,.gcode,.gc,.gco,.nc,.ngc';
				case 'filament': return '.zip';
				case 'sys': return '.zip,.g,.csv';
				case 'web': return '.zip,.csv,.g,.json,.htm,.html,.ico,.xml,.css,.map,.js,.ttf,.eot,.svg,.woff,.woff2,.jpeg,.jpg,.png,.gz';
				case 'update': return '.zip,.bin';
			}
		},
		destinationDirectory() {
			if (this.directory !== undefined) {
				return this.directory;
			}

			switch (this.target) {
				case 'gcode': return Path.gcodes;
				case 'gcodeStart': return Path.gcodes;
				case 'macro': return Path.macros;
				case 'filament': return Path.filaments;
				case 'sys': return Path.sys;
				case 'web': return Path.www;
				case 'update': return Path.sys;
			}
		}
	},
	data() {
		return {
			color: 'default',
			uploading: false
		}
	},
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
			if (this.type === 'uploadStart' && files.length !== 1) {
				this.$toast.makeNotification('error', this.$t(`button.upload['${this.target}'].caption`), this.$t('error.uploadStartWrongFileCount'));
			}

			this.uploading = true;
			for (let i = 0; i < files.length; i++) {
				const type = (this.target === 'gcodeStart') ? 'gcode' : this.target;
				const file = files[i], destination = Path.combine(this.destinationDirectory, file.name);
				try {
					// Upload a file
					const fileTransfer = await this.upload({ file, destination, type });
					await this.$toast.makeFileTransferNotification(fileTransfer);

					// Run it (if required)
					if (this.target === 'uploadStart') {
						await this.sendCode(`M32 "${destination}"`);
					}
				} catch (e) {
					// There is basically no need to do anything else here; the toast wrapper takes care of everything
					break;
				}
			}
			this.uploading = false;
		},
		dragOver(e) {
			this.color = 'success';
		},
		dragLeave(e) {
			this.color = 'default';
		},
		async dragDrop(e) {
			this.color = 'default';
			await this.doUpload(e.dataTransfer.files);
		}
	}
}
</script>
