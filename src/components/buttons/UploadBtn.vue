<template>
	<div>
		<v-btn v-bind="$props" @click="chooseFile" :disabled="$props.disabled || !canUpload" :loading="isBusy" :title="$t(`button.upload['${target}'].title`)" :color="innerColor" @dragover="dragOver" @dragleave="dragLeave" @drop.prevent.stop="dragDrop">
			<template #loader>
				<v-progress-circular indeterminate :size="23" :width="2" class="mr-2"></v-progress-circular>
				{{ caption }}
			</template>

			<slot>
				<v-icon class="mr-2">mdi-cloud-upload</v-icon> {{ caption }}
			</slot>
		</v-btn>

		<input ref="fileInput" type="file" :accept="accept" hidden @change="fileSelected" multiple>
		<confirm-dialog :shown.sync="confirmUpdate" :title="$t('dialog.update.title')" :prompt="$t('dialog.update.prompt')" @confirmed="startUpdate"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import JSZip from 'jszip'
import { VBtn } from 'vuetify/lib'

import { mapState, mapGetters, mapActions } from 'vuex'

import { NetworkInterfaceType, StatusType } from '../../store/machine/modelEnums.js'
import Path from '../../utils/path.js'
import { DisconnectedError } from '../../utils/errors.js'

const webExtensions = ['.htm', '.html', '.ico', '.xml', '.css', '.map', '.js', '.ttf', '.eot', '.svg', '.woff', '.woff2', '.jpeg', '.jpg', '.png']

export default {
	computed: {
		...mapState(['isLocal']),
		...mapState('machine/model', ['boards', 'directories', 'network', 'state']),
		...mapGetters(['isConnected', 'uiFrozen']),
		caption() {
			if (this.extracting) {
				return this.$t('generic.extracting');
			}
			if (this.uploading) {
				return this.$t('generic.uploading');
			}
			return this.$t(`button.upload['${this.target}'].caption`);
		},
		canUpload() {
			return this.isConnected && !this.uiFrozen;
		},
		accept() {
			switch (this.target) {
				case 'gcodes': return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap';
				case 'start': return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap';
				case 'macros': return '*';
				case 'filaments': return '.zip';
				case 'firmware': return '.zip,.bin';
				case 'menu': return '*';
				case 'system': return '.zip,.bin,.json,.g,.csv';
				case 'web': return '.zip,.csv,.json,.htm,.html,.ico,.xml,.css,.map,.js,.ttf,.eot,.svg,.woff,.woff2,.jpeg,.jpg,.png,.gz';
			}
			return undefined;
		},
		destinationDirectory() {
			if (this.directory) {
				return this.directory;
			}

			switch (this.target) {
				case 'gcodes': return this.directories.gCodes;
				case 'start': return this.directories.gCodes;
				case 'firmware': return this.directories.firmware;
				case 'macros': return this.directories.macros;
				case 'filaments': return this.directories.filaments;
				case 'menu': return this.directories.menu;
				case 'system': return this.directories.system;
				case 'web': return this.directories.web;
			}
			return undefined;
		},
		isBusy() {
			return this.extracting || this.uploading;
		}
	},
	data() {
		return {
			innerColor: this.color,
			extracting: false,
			uploading: false,

			confirmUpdate: false,
			updates: {
				webInterface: false,
				firmwareBoards: [],
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
			if (!this.isBusy) {
				this.$refs.fileInput.click();
			}
		},
		async fileSelected(e) {
			await this.doUpload(e.target.files);
			e.target.value = '';
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
		getFirmwareName(fileName) {
			let result = null;
			this.boards.forEach((board, index) => {
				if (board && board.firmwareFileName && (board.canAddress || index === 0)) {
					const regEx = new RegExp(board.firmwareFileName.replace(/\.bin$/, '(.*)\\.bin'), 'i');
					if (regEx.test(fileName)) {
						result = board.firmwareFileName;
						this.updates.firmwareBoards.push(board.canAddress || 0);
					}
				}
			}, this);
			return result;
		},
		getBinaryName(key, fileName) {
			let result = null;
			this.boards.forEach(board => {
				if (board && board[key]) {
					const regEx = new RegExp(board[key].replace(/\.bin$/, '(.*)\\.bin'), 'i');
					if (regEx.test(fileName)) {
						result = board[key];
					}
				}
			});
			return result;
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
					const zip = new JSZip(), zipFiles = [], target = this.target;
					this.extracting = true;
					try {
						// Open the ZIP file and read its content
						await zip.loadAsync(files[0], { checkCRC32: true });
						zip.forEach(function(file) {
							if (!file.endsWith('/') && (file.split('/').length === 2 || target !== 'filaments')) {
								zipFiles.push(file);
							}
						});

						// Could we get anything useful?
						if (!zipFiles.length) {
							this.extracting = false;
							this.$makeNotification('error', this.$t(`button.upload['${this.target}'].caption`), this.$t('error.uploadNoFiles'));
							return;
						}

						// Extract everything and start the upload
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
					this.extracting = false;
					return;
				}
			}

			this.updates.webInterface = false;
			this.updates.firmwareBoards = [];
			this.updates.wifiServer = false;
			this.updates.wifiServerSpiffs = false;

			let success = true;
			this.uploading = true;
			for (let i = 0; i < files.length; i++) {
				const content = files[i];

				// Adjust filename if an update is being uploaded
				let filename = Path.combine(this.destinationDirectory, content.name);
				if (this.target === 'system' || this.target === 'firmware') {
					if (Path.isSdPath('/' + content.name)) {
						filename = Path.combine('0:/', content.name);
					} else if (this.isWebFile(content.name)) {
						filename = Path.combine(this.directories.web, content.name);
						this.updates.webInterface |= /index.html(\.gz)?/i.test(content.name);
					} else {
						const firmwareFileName = this.getFirmwareName(content.name);
						const bootloaderFileName = this.getBinaryName('bootloaderFileName', content.name);
						const iapFileNameSBC = this.getBinaryName('iapFileNameSBC', content.name);
						const iapFileNameSD = this.getBinaryName('iapFileNameSD', content.name);
						if (firmwareFileName) {
							filename = Path.combine(this.directories.firmware, firmwareFileName);
						} else if (bootloaderFileName) {
							filename = Path.combine(this.directories.firmware, bootloaderFileName);
						} else if (this.state.dsfVersion && iapFileNameSBC) {
							filename = Path.combine(this.directories.firmware, iapFileNameSBC);
						} else if (iapFileNameSD) {
							filename = Path.combine(this.directories.firmware, iapFileNameSD);
						} else if (!this.state.dsfVersion && this.network.interfaces.some(iface => iface.type === NetworkInterfaceType.wifi)) {
							if ((/DuetWiFiSocketServer(.*)\.bin/i.test(content.name) || /DuetWiFiServer(.*)\.bin/i.test(content.name))) {
								filename = Path.combine(this.directories.firmware, 'DuetWiFiServer.bin');
								this.updates.wifiServer = true;
							} else if (/DuetWebControl(.*)\.bin/i.test(content.name)) {
								filename = Path.combine(this.directories.firmware, 'DuetWebControl.bin');
								this.updates.wifiServerSpiffs = true;
							}
						} else if (content.name.endsWith('.bin')) {
							// FIXME This will be no longer needed when CAN board enumeration is supported
							filename = Path.combine(this.directories.firmware, content.name);
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
				this.$emit('uploadComplete', files);

				if ((this.updates.firmwareBoards.length > 0) || this.updates.wifiServer || this.updates.wifiServerSpiffs) {
					// Ask user to perform an update
					this.confirmUpdate = true;
				} else if (!this.isLocal && this.updates.webInterface) {
					// Reload the web interface immediately if it was the only update
					location.reload(true);
				}

				// FIXME For some reason the $t function throws an exception when this button is floating
				if (zipName) {
					const secondsPassed = Math.round((new Date() - startTime) / 1000);
					this.$makeNotification('success', this.$t('notification.upload.success', [zipName, this.$displayTime(secondsPassed)]));
				}
			}
		},
		async startUpdate() {
			// Update expansion boards
			for (let i = 0; i < this.updates.firmwareBoards.length; i++) {
				const boardToUpdate = this.updates.firmwareBoards[i];
				if (boardToUpdate > 0) {
					try {
						await this.sendCode(`M997 B${boardToUpdate}`);
						do {
							// Wait in 2-second intervals until the status is no longer 'Updating'
							await new Promise(resolve => setTimeout(resolve, 2000));

							// Stop if the connection has been interrupted
							if (!this.isConnected) {
								return;
							}
						} while (this.state.status === StatusType.updating);

					} catch (e) {
						if (!(e instanceof DisconnectedError)) {
							console.warn(e);
							this.$log('error', this.$t('generic.error'), e.message);
						}
					}
				}
			}

			// Update other modules
			let modules = [];
			if (this.updates.firmwareBoards.indexOf(0) >= 0) {
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
				await this.sendCode(`M997 S${modules.join(':')}`);
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					this.$log('error', this.$t('generic.error'), e.message);
				}
			}
		},
		dragOver(e) {
			e.preventDefault();
			e.stopPropagation();
			if (!this.isBusy) {
				this.innerColor = 'success';
			}
		},
		dragLeave(e) {
			e.preventDefault();
			e.stopPropagation();
			this.innerColor = this.color;
		},
		async dragDrop(e) {
			this.innerColor = this.color;
			if (!this.isBusy && e.dataTransfer.files.length) {
				await this.doUpload(e.dataTransfer.files);
			}
		}
	},
	watch: {
		isConnected(to) {
			if (to && !this.isLocal && this.updates.codeSent && this.updates.webInterface) {
				// Reload the web interface when the connection could be established again
				location.reload(true);
			}
		}
	}
}
</script>
