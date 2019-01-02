<template>
	<div>
		<v-btn v-bind="$props" @click="chooseFile" :disabled="$props.disabled || !canUpload" :loading="uploading" :title="$t(`button.upload['${target}'].title`)" :color="innerColor" @dragover="dragOver" @dragleave="dragLeave" @drop.prevent.stop="dragDrop" tabindex="0">
			<v-icon class="mr-2">cloud_upload</v-icon> {{ $t(`button.upload['${target}'].caption`) }}
		</v-btn>

		<input ref="fileInput" type="file" :accept="accept" hidden @change="fileSelected" multiple>
		<confirm-dialog :shown.sync="confirmUpdate" question="Install updates?" prompt="You have uploaded at least one firmware update. Would you like to install them now?" @confirmed="startUpdate"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import JSZip from 'jszip'
import VBtn from 'vuetify/es5/components/VBtn'

import { mapState, mapGetters, mapActions } from 'vuex'
import Path from '../../utils/path.js'

const webExtensions = ['.json', '.htm', '.html', '.ico', '.xml', '.css', '.map', '.js', '.ttf', '.eot', '.svg', '.woff', '.woff2', '.jpeg', '.jpg', '.png']

export default {
	computed: {
		...mapState(['isLocal']),
		...mapGetters(['isConnected', 'uiFrozen']),
		...mapGetters('machine/model', ['board']),
		canUpload() {
			return this.isConnected && !this.uiFrozen;
		},
		accept() {
			switch (this.target) {
				case 'gcodes': return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap';
				case 'start': return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap';
				case 'macros': return '.g,.gcode,.gc,.gco,.nc,.ngc';
				case 'filaments': return '.zip';
				case 'display': return '*';
				case 'sys': return '.zip,.bin,.json,.g,.csv';
				case 'www': return '.zip,.csv,.json,.htm,.html,.ico,.xml,.css,.map,.js,.ttf,.eot,.svg,.woff,.woff2,.jpeg,.jpg,.png,.gz';
				case 'update': return '.zip,.bin';
			}
			return undefined;
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
				case 'display': return Path.display;
				case 'sys': return Path.sys;
				case 'www': return Path.www;
				case 'update': return Path.sys;
			}
			return undefined;
		}
	},
	data() {
		return {
			innerColor: this.color,
			uploading: false,

			confirmUpdate: false,
			updates: {
				webInterface: false,
				firmware: false,
				wifiServer: false,
				wifiServerSpiffs: false,

				codeSent: false
			}
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
		...mapActions('machine', ['sendCode', 'upload']),
		chooseFile() {
			if (!this.uploading) {
				this.$refs.fileInput.click();
			}
		},
		async fileSelected(e) {
			await this.doUpload(e.target.files);
			this.$refs.fileInput.value = "";
		},
		isWebFile(filename) {
			if (webExtensions.some(extension => filename.toLowerCase().endsWith(extension))) {
				return true;
			}

			const matches = /(\.[^.]+).gz$/i.exec(filename);
			if (matches && webExtensions.indexOf(matches[1].toLowerCase()) !== -1) {
				return true;
			}
			return false;
		},
		async doUpload(files, zipName, startTime) {
			if (!files.length) {
				return;
			}

			if (this.target === 'start' && files.length !== 1) {
				this.$makeNotification('error', this.$t(`button.upload['${this.target}'].caption`), this.$t('error.uploadStartWrongFileCount'));
				return;
			}

			if (!zipName) {
				if (files.length > 1 && files[0].name.toLowerCase().endsWith('.zip')) {
					this.$makeNotification('error', this.$t(`button.upload['${this.target}'].caption`), this.$t('error.uploadNoSingleZIP'));
					return;
				}

				if (files[0].name.toLowerCase().endsWith('.zip')) {
					// Open the ZIP file and read its content
					const zip = new JSZip(), zipFiles = [], target = this.target;
					await zip.loadAsync(files[0], { checkCRC32: true });
					zip.forEach(function(file) {
						if (!file.endsWith('/') && (file.split('/').length === 2 || target !== 'filaments')) {
							zipFiles.push(file);
						}
					});

					// Could we get anything useful?
					if (!zipFiles.length) {
						this.$makeNotification('error', this.$t(`button.upload['${this.target}'].caption`), this.$t('error.uploadNoFiles'));
						return;
					}

					// Extract everything and start the upload
					try {
						for (let i = 0; i < zipFiles.length; i++) {
							const name = zipFiles[i];
							zipFiles[i] = await zip.file(name).async('blob');
							zipFiles[i].name = name;
						}
						this.doUpload(zipFiles, files[0].name, new Date());
					} catch (e) {
						console.warn(e);
						this.$makeNotification('error', this.$t('error.uploadDecompressionFailed'), e.message);
					}
					return;
				}
			}

			this.updates.webInterface = false;
			this.updates.firmware = false;
			this.updates.wifiServer = false;
			this.updates.wifiServerSpiffs = false;

			let success = true;
			this.uploading = true;
			for (let i = 0; i < files.length; i++) {
				const content = files[i];

				// Adjust filename if an update is being uploaded
				let filename = Path.combine(this.destinationDirectory, content.name);
				if (this.target === 'sys' || this.target === 'update') {
					if (this.isWebFile(content.name)) {
						filename = Path.combine(Path.www, content.name);
						this.updates.webInterface |= /index.html(\.gz)?/i.test(content.name);
					} else if (this.board.firmwareFileRegEx.test(content.name)) {
						filename = Path.combine(Path.sys, this.board.firmwareFile);
						this.updates.firmware = true;
					} else if (this.board.hasWiFi) {
						if ((/DuetWiFiSocketServer(.*)\.bin/i.test(content.name) || /DuetWiFiServer(.*)\.bin/i.test(content.name))) {
							filename = Path.combine(Path.sys, 'DuetWiFiServer.bin');
							this.updates.wifiServer = true;
						} else if (/DuetWebControl(.*)\.bin/i.test(content.name)) {
							filename = Path.combine(Path.sys, 'DuetWebControl.bin');
							this.updates.wifiServerSpiffs = true;
						}
					}
				}

				try {
					// Start uploading
					if (files.length > 1) {
						await this.upload({ filename, content, showSuccess: !zipName, num: i + 1, count: files.length });
					} else {
						await this.upload({ filename, content });
					}

					// Run it (if required)
					if (this.target === 'start') {
						await this.sendCode(`M32 "${filename}"`);
					}
				} catch (e) {
					success = false;
					this.$emit('uploadFailed', { filename, reason: e });
					break;
				}
			}
			this.uploading = false;

			if (success) {
				if (zipName) {
					const secondsPassed = Math.round((new Date() - startTime) / 1000);
					this.$makeNotification('success', this.$t('notification.upload.success', [zipName, this.$displayTime(secondsPassed)]));
				}
				this.$emit('uploadComplete', files);

				if (this.updates.firmware || this.updates.wifiServer || this.updates.wifiServerSpiffs) {
					// Ask user to perform an update
					this.confirmUpdate = true;
				} else if (!this.isLocal && this.updates.webInterface) {
					// Reload the web interface immediately if it was the only update
					location.reload();
				}
			}
		},
		async startUpdate() {
			// Start firmware update
			let modules = [];
			if (this.updates.firmware) {
				modules.push('0');
			}
			if (this.updates.wifiServer) {
				modules.push('1');
			}
			if (this.updates.wifiServerSpiffs) {
				modules.push('2');
			}

			this.updates.codeSent = true;
			try {
				await this.sendCode(`M997 S${modules.reduce((a, b) => `${a}:${b}`)}`);
			} catch (e) {
				// this is expected
			}
		},
		dragOver(e) {
			e.preventDefault();
			e.stopPropagation();
			this.innerColor = 'success';
		},
		dragLeave(e) {
			e.preventDefault();
			e.stopPropagation();
			this.innerColor = this.color;
		},
		async dragDrop(e) {
			this.innerColor = this.color;
			if (e.dataTransfer.files.length) {
				await this.doUpload(e.dataTransfer.files);
			}
		}
	},
	watch: {
		isConnected(to) {
			if (to && !this.isLocal && this.updates.codeSent && this.updates.webInterface) {
				// Reload the web interface when the connection could be established again
				location.reload();
			}
		}
	}
}
</script>
