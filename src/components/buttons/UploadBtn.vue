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
		<firmware-update-dialog :shown.sync="confirmUpdate" @confirmed="startUpdate"></firmware-update-dialog>
		<config-updated-dialog :shown.sync="confirmFirmwareReset"></config-updated-dialog>
	</div>
</template>

<script>
'use strict'

import JSZip from 'jszip'
import { VBtn } from 'vuetify/lib'

import { mapState, mapGetters, mapActions } from 'vuex'

import { isPrinting, NetworkInterfaceType, StatusType } from '@/store/machine/modelEnums'
import { DisconnectedError } from '@/utils/errors'
import Events from '@/utils/events.js'
import Path from '@/utils/path.js'

const webExtensions = ['.htm', '.html', '.ico', '.xml', '.css', '.map', '.js', '.ttf', '.eot', '.svg', '.woff', '.woff2', '.jpeg', '.jpg', '.png']

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapState('machine/model', ['boards', 'directories', 'network', 'state']),
		...mapState('settings', ['ignoreFileTimestamps']),
		...mapGetters('machine', ['connector']),
		...mapGetters(['isConnected', 'uiFrozen']),
		connectorType() {
			return this.connector ? this.connector.type : null;
		},
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
				case 'start': return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap,.zip';
				case 'macros': return '*';
				case 'filaments': return '.zip';
				case 'firmware': return '.zip,.bin,.uf2';
				case 'menu': return '*';
				case 'system': return '.zip,.bin,.uf2,.json,.g,.csv,.xml' + (this.connectorType === 'rest' ? ',.deb' : '');
				case 'web': return '.zip,.csv,.json,.htm,.html,.ico,.xml,.css,.map,.js,.ttf,.eot,.svg,.woff,.woff2,.jpeg,.jpg,.png,.gz';
				case 'plugin': return '.zip';
				case 'update': return '.zip,.bin,.uf2';
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
				// plugin is not applicable
                case 'update': return this.directories.firmware;
			}
			return undefined;
		},
		isBusy() {
			return this.extracting || this.uploading;
		},
		confirmFirmwareReset: {
			get() { return !this.confirmUpdate && this.confirmReset; },
			set(value) { this.confirmReset = value; }
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
				panelDue: false,

				codeSent: false
			},
			confirmReset: false
		}
	},
	extends: VBtn,
	props: {
		directory: String,
        machine: String,
		target: {
			type: String,
			required: true
		},
		uploadPrint: Boolean
	},
	methods: {
		...mapActions('machine', ['sendCode', 'upload', 'installSystemPackage']),
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
			if (webExtensions.some(extension => filename.toLowerCase().endsWith(extension)) ||
				filename === 'manifest.json' || filename === 'manifest.json.gz' || filename === 'robots.txt') {
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
					const binRegEx = new RegExp(board.firmwareFileName.replace(/\.bin$/, '(.*)\\.bin'), 'i');
					const uf2RegEx = new RegExp(board.firmwareFileName.replace(/\.uf2$/, '(.*)\\.uf2'), 'i');
					if (binRegEx.test(fileName) || uf2RegEx.test(fileName)) {
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
					const binRegEx = new RegExp(board[key].replace(/\.bin$/, '(.*)\\.bin'), 'i');
					const uf2RegEx = new RegExp(board[key].replace(/\.uf2$/, '(.*)\\.uf2'), 'i');
					if (binRegEx.test(fileName) || uf2RegEx.test(fileName)) {
						result = board[key];
					}
				}
			});
			return result;
		},
		async doUpload(files, zipName, startTime) {
			if (files.length === 0) {
				// Skip empty upload requests
				return;
			}

			// Cannot start more than one file via Upload & Start or Install Plugin
			if ((this.target === 'start' || this.target === 'plugin') && files.length !== 1) {
				this.$makeNotification('error', this.$t(`button.upload['${this.target}'].caption`), this.$t('error.uploadStartWrongFileCount'));
				return;
			}

			// Check if a ZIP file may be extracted
			if (!zipName) {
				if (files.length > 1 && files[0].name.toLowerCase().endsWith('.zip')) {
					this.$makeNotification('error', this.$t(`button.upload['${this.target}'].caption`), this.$t('error.uploadNoSingleZIP'));
					return;
				}

				if (files[0].name.toLowerCase().endsWith('.zip')) {
					const zip = new JSZip(), zipFiles = [], target = this.target;
					const notification = this.$makeNotification('info', this.$t('notification.decompress.title'), this.$t('notification.decompress.message'), 0);
					this.extracting = true;
					try {
						try {
							notification.progress = 0;
							await zip.loadAsync(files[0], { checkCRC32: true });

							// Check if this is a plugin
							if (this.target === 'start' || this.target === 'system' || this.target === 'update' || this.target === 'plugin') {
								let isPlugin = false;
								zip.forEach(function(file) {
									if (file === 'plugin.json') {
										isPlugin = true;
									}
								});

								if (isPlugin) {
									this.extracting = false;
									notification.close();

									this.$root.$emit(Events.installPlugin, {
										machine: this.machine || this.selectedMachine,
										zipFilename: files[0].name,
										zipBlob: files[0],
										zipFile: zip,
										start: this.target === 'start'
									});
									return;
								}
								else if (this.target === 'plugin') {
                                    // Don't proceed if this is no plugin file
									return;
                                }
							}

							// Get a list of files to unpack
							zip.forEach(function(file) {
								if (!file.endsWith('/') && (file.split('/').length === 2 || target !== 'filaments')) {
									zipFiles.push(file);
								}
							});

							// Could we get anything useful?
							if (zipFiles.length === 0) {
								this.extracting = false;
								this.$makeNotification('error', this.$t(`button.upload['${this.target}'].caption`), this.$t('error.uploadNoFiles'));
								return;
							}

							// Extract everything and start the upload
							for (let i = 0; i < zipFiles.length; i++) {
								const name = zipFiles[i];
								zipFiles[i] = await zip.file(name).async('blob');
								zipFiles[i].name = name;
								notification.progress = Math.round(((i + 1) / zipFiles.length) * 100);
							}
							this.doUpload(zipFiles, files[0].name, new Date());
						} finally {
							this.extracting = false;
							notification.close();
						}
						return;
					} catch (e) {
						this.$makeNotification('error', this.$t('notification.decompress.errorTitle'), e.message);
						throw e;
					}
				}
			}

            if (this.target === 'plugin') {
                // Don't proceed if this is no plugin file
                return;
            }

			// Check what types of files we have and where they need to go
			this.updates.webInterface = false;
			this.updates.firmwareBoards = [];
			this.updates.wifiServer = false;
			this.updates.wifiServerSpiffs = false;
			this.updates.panelDue = false;

			for (let i = 0; i < files.length; i++) {
				let content = files[i], filename = Path.combine(this.destinationDirectory, content.name);
                if (this.target === 'firmware' || this.target === 'system' || this.target === 'update') {
					if (Path.isSdPath('/' + content.name)) {
						filename = Path.combine('0:/', content.name);
					} else if (this.isWebFile(content.name)) {
						filename = Path.combine(this.directories.web, content.name);
						this.updates.webInterface |= /index.html(\.gz)?/i.test(content.name);
					} else if (this.connectorType === 'rest' && /\.deb$/.test(content.name)) {
						// TODO improve this
						try {
							await this.installSystemPackage({
								filename: content.name,
								blob: content
							});
							alert(`Installation of ${content.name} succesful`);
						} catch (e) {
							alert(`Installation of ${content.name} failed: ${e}`);
						}
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
							} else if (content.name.endsWith('.bin') || content.name.endsWith('.uf2')) {
								filename = Path.combine(this.directories.firmware, content.name);
								if (content.name === 'PanelDueFirmware.bin') {
									this.updates.panelDue = true;
								}
							}
						} else if (content.name.endsWith('.bin') || content.name.endsWith('.uf2')) {
							filename = Path.combine(this.directories.firmware, content.name);
							if (content.name === 'PanelDueFirmware.bin') {
								this.updates.panelDue = true;
							}
						}
					}
				}
				content.filename = filename;
			}
			const askForUpdate = (this.updates.firmwareBoards.length > 0) || this.updates.wifiServer || this.updates.wifiServerSpiffs || this.updates.panelDue;

			// Start uploading
			this.uploading = true;
			try
			{
				if (files.length === 1) {
					await this.upload({ filename: files[0].filename, content: files[0], showSuccess: !zipName });
				} else {
					const filelist = [];
					for (let i = 0; i < files.length; i++) {
						filelist.push({
							filename: files[i].filename,
							content: files[i]
						});
					}
					await this.upload({ files: filelist, showSuccess: !zipName, closeProgressOnSuccess: askForUpdate });
				}
				this.$emit('uploadComplete', files);
			} catch (e) {
				this.uploading = false;
				this.$emit('uploadFailed', { files, error: e });
				return;
			}
			this.uploading = false;

			// Deal with Upload & Start
			if (this.target === 'start') {
				await this.sendCode(`M32 "${files[0].filename}"`);
			}

			// Deal with updates
			if (askForUpdate) {
				// Ask user to perform an update
				this.confirmUpdate = true;
			} else if (this.selectedMachine === location.host && this.updates.webInterface) {
				// Reload the web interface immediately if it was the only update
				location.reload(true);
			}

			// Deal with config files
			const configFile = Path.combine(this.directories.system, Path.configFile);
			for (let file of files) {
				const fullName = Path.combine(this.destinationDirectory, file.filename);
				if (!isPrinting(this.state.status) && (fullName === Path.configFile || fullName === configFile || fullName === Path.boardFile)) {
					// Ask for firmware reset when config.g or 0:/sys/board.txt (RRF on LPC) has been replaced
					this.confirmReset = true;
					break;
				}
			}

			// Show success after uploading a ZIP
			if (zipName) {
				const secondsPassed = Math.round((new Date() - startTime) / 1000);
				this.$makeNotification('success', this.$t('notification.upload.success', [zipName, this.$displayTime(secondsPassed)]), null);
			}
		},
		async startUpdate() {
			// Don't show a reset confirmation while updating
			this.confirmReset = false;

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

			// Update other modules if applicable
			const modules = [];
			if (this.updates.firmwareBoards.indexOf(0) >= 0) {
				modules.push('0');
			}
			if (this.updates.wifiServer) {
				modules.push('1');
			}
			if (this.updates.wifiServerSpiffs) {
				modules.push('2');
			}
			// module 3 means put wifi server into bootloader mode, not supported here
			if (this.updates.panelDue) {
				modules.push('4');
			}

			if (modules.length > 0) {
				this.updates.codeSent = true;
				try {
					await this.sendCode(`M997 S${modules.join(':')}`);
				} catch (e) {
					if (!(e instanceof DisconnectedError)) {
						console.warn(e);
						this.$log('error', this.$t('generic.error'), e.message);
					}
				}
			}

			// Ask for a firmware reset if expansion boards but not the main board have been updated
			this.confirmReset = (modules.indexOf('0') === -1) && (this.updates.firmwareBoards.findIndex(board => board > 0) !== -1);
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
			if (to && this.selectedMachine === location.host && this.updates.codeSent && this.updates.webInterface) {
				// Reload the web interface when the connection could be established again
				location.reload(true);
			}
		}
	}
}
</script>
