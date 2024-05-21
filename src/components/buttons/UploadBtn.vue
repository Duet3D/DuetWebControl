<template>
	<div>
		<v-btn v-bind="$props" @click="chooseFile" :disabled="$props.disabled || !canUpload" :fab="fab"
			   :loading="isBusy" :title="title" :color="innerColor" @dragover.prevent.stop="dragOver"
			   @dragleave.prevent.stop="dragLeave" @drop.prevent.stop="dragDrop">
			<template #loader>
				<v-progress-circular indeterminate :size="23" :width="2" class="mr-2" />
				{{ caption }}
			</template>

			<slot>
				<v-icon class="mr-2">mdi-cloud-upload</v-icon>
				{{ caption }}
			</slot>
		</v-btn>

		<input ref="fileInput" type="file" :accept="accept" hidden @change="fileSelected" multiple>
		<firmware-update-dialog :shown.sync="confirmUpdate" :multipleUpdates="multipleUpdates"
								:updateWiFiFirmware.sync="updates.wifiServer" @confirmed="startUpdate" />
		<config-updated-dialog :shown.sync="confirmFirmwareReset" />
	</div>
</template>

<script lang="ts">
import { NetworkInterfaceType, MachineStatus, Board } from "@duet3d/objectmodel";
import JSZip from "jszip";
import Vue, { PropType } from "vue";

import store from "@/store";
import { isPrinting } from "@/utils/enums";
import { getErrorMessage, DisconnectedError } from "@/utils/errors";
import Events from "@/utils/events";
import { LogType } from "@/utils/logging";
import Path, { escapeFilename } from "@/utils/path";

const webExtensions: Array<string> = [".htm", ".html", ".ico", ".xml", ".css", ".map", ".js", ".ttf", ".eot", ".svg", ".woff", ".woff2", ".jpeg", ".jpg", ".png"];

/**
 * Types of uploads
 */
export enum UploadType {
	/**
	 * Upload to /gcodes
	 */
	gcodes = "gcodes",

	/**
	 * Upload & start (to /gcodes)
	 */
	start = "start",

	/**
	 * Upload to /macros
	 */
	macros = "macros",

	/**
	 * Upload to /filaments
	 */
	filaments = "filaments",

	/**
	 * Upload to /firmware (used to be /sys)
	 */
	firmware = "firmware",

	/**
	 * Upload to /menu
	 */
	menu = "menu",

	/**
	 * Upload to /sys
	 */
	system = "system",

	/**
	 * Upload to /www
	 */
	web = "web",

	/**
	 * Upload for plugin installation
	 */
	plugin = "plugin",

	/**
	 * Upload for general updates (firmware, web interface)
	 */
	update = "update"
};

export default Vue.extend({
	props: {
		color: String,
		directory: String,
		fab: Boolean,
		machine: String,
		target: {
			type: String as PropType<UploadType>,
			required: true
		},
		uploadPrint: Boolean
	},
	computed: {
		isConnected(): boolean { return store.getters["isConnected"]; },
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		caption(): string {
			if (this.extracting) {
				return this.$t("generic.extracting");
			}
			if (this.uploading) {
				return this.$t("generic.uploading");
			}
			return this.$t(`button.upload.${this.target}.caption`);
		},
		title(): string {
			return this.$t(`button.upload.${this.target}.title`);
		},
		canUpload(): boolean {
			return this.isConnected && !this.uiFrozen;
		},
		accept(): string | undefined {
			switch (this.target) {
				case UploadType.gcodes: return ".g,.gcode,.gc,.gco,.nc,.ngc,.tap";
				case UploadType.start: return ".g,.gcode,.gc,.gco,.nc,.ngc,.tap,.zip";
				case UploadType.macros: return "*";
				case UploadType.filaments: return ".zip";
				case UploadType.firmware: return ".zip,.bin,.uf2";
				case UploadType.menu: return "*";
				case UploadType.system: return ".zip,.bin,.uf2,.json,.g,.csv,.xml" + ((store.state.machine.model.sbc !== null) ? ",.deb" : "");
				case UploadType.web: return ".zip,.csv,.json,.htm,.html,.ico,.xml,.css,.map,.js,.ttf,.eot,.svg,.woff,.woff2,.jpeg,.jpg,.png,.gz";
				case UploadType.plugin: return ".zip";
				case UploadType.update: return ".zip,.bin,.uf2";
				default:
					const _exhaustiveCheck: never = this.target;
					return undefined;
			}
		},
		destinationDirectory(): string | undefined {
			if (this.directory) {
				return this.directory;
			}

			switch (this.target) {
				case UploadType.gcodes: return store.state.machine.model.directories.gCodes;
				case UploadType.start: return store.state.machine.model.directories.gCodes;
				case UploadType.firmware: return store.state.machine.model.directories.firmware;
				case UploadType.macros: return store.state.machine.model.directories.macros;
				case UploadType.filaments: return store.state.machine.model.directories.filaments;
				case UploadType.menu: return store.state.machine.model.directories.menu;
				case UploadType.system: return store.state.machine.model.directories.system;
				case UploadType.web: return store.state.machine.model.directories.web;
				case UploadType.plugin: return undefined;	// not applicable
				case UploadType.update: return store.state.machine.model.directories.firmware;
				default:
					const _exhaustiveCheck: never = this.target;
					return undefined;
			}
		},
		isBusy(): boolean {
			return this.extracting || this.uploading;
		},
		confirmFirmwareReset: {
			get(): boolean { return !this.confirmUpdate && this.confirmReset; },
			set(value: boolean): void { this.confirmReset = value; }
		},
		multipleUpdates(): boolean {
			let numUpdates = this.updates.firmwareBoards.length;
			numUpdates += this.updates.wifiServer ? 1 : 0;
			numUpdates += this.updates.wifiServerSpiffs ? 1 : 0;
			numUpdates += this.updates.display ? 1 : 0;
			return numUpdates > 1;
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
				firmwareBoards: new Array<number>(),
				wifiServer: false,
				wifiServerSpiffs: false,
				display: false,

				codeSent: false
			},
			confirmReset: false
		}
	},
	methods: {
		chooseFile() {
			if (!this.isBusy && this.$refs.fileInput !== null) {
				(this.$refs.fileInput as HTMLInputElement).click();
			}
		},
		async fileSelected(e: Event) {
			if (e.target !== null) {
				const inputElement = e.target as HTMLInputElement;
				if (inputElement.files) {
					try {
						await this.doUpload(inputElement.files);
					} finally {
						inputElement.value = "";
					}
				}
			}
		},
		isWebFile(filename: string): boolean {
			if (webExtensions.some(extension => filename.toLowerCase().endsWith(extension)) ||
				filename === "manifest.json" || filename === "manifest.json.gz" || filename === "robots.txt") {
				return true;
			}

			const matches = /(\.[^.]+).gz$/i.exec(filename);
			return (matches !== null) && webExtensions.includes(matches[1].toLowerCase());
		},
		getFirmwareName(fileName: string): string | null {
			let result: string | null = null;
			for (const board of store.state.machine.model.boards) {
				if (board && board.firmwareFileName) {
					const binRegEx = new RegExp(board.firmwareFileName.replace(/\.bin$/, "(.*)\\.bin"), "i");
					const uf2RegEx = new RegExp(board.firmwareFileName.replace(/\.uf2$/, "(.*)\\.uf2"), "i");
					if (binRegEx.test(fileName) || uf2RegEx.test(fileName)) {
						result = board.firmwareFileName;
						this.updates.firmwareBoards.push(board.canAddress || 0);
					}
				}
			}
			return result;
		},
		getBinaryName<T extends Extract<keyof Board, string>>(key: T, fileName: string): string | null {
			for (const board of store.state.machine.model.boards) {
				if (board && board[key]) {
					const boardValue = board[key] as string;
					const binRegEx = new RegExp(boardValue.replace(/\.bin$/, "(.*)\\.bin"), "i");
					const uf2RegEx = new RegExp(boardValue.replace(/\.uf2$/, "(.*)\\.uf2"), "i");
					if (binRegEx.test(fileName) || uf2RegEx.test(fileName)) {
						return boardValue;
					}
				}
			}
			return null;
		},
		async doUpload(files: FileList | Array<File>, zipName?: string, startTime?: Date): Promise<void> {
			if (files.length === 0) {
				// Skip empty upload requests
				return;
			}

			// Cannot start more than one file via Upload & Start or Install Plugin
			if ((this.target === UploadType.start || this.target === UploadType.plugin) && files.length !== 1) {
				this.$makeNotification(LogType.error, this.$t(`button.upload.${this.target}.caption`), this.$t("error.uploadStartWrongFileCount"));
				return;
			}

			// Check if a ZIP file may be extracted
			if (!zipName) {
				if (files.length > 1 && Array.from(files).some(file => file.name.toLowerCase().endsWith(".zip"))) {
					this.$makeNotification(LogType.error, this.$t(`button.upload.${this.target}.caption`), this.$t("error.uploadNoSingleZIP"));
					return;
				}

				if (store.state.machine.model.sbc !== null && files[0].name.toLowerCase() === "dsf-update.zip") {
					await store.dispatch("machine/installSystemPackage", {
						filename: files[0].name,
						packageData: files[0]
					});
					return;
				}

				if (files[0].name.toLowerCase().endsWith(".zip")) {
					const zip = new JSZip(), zipFiles: Array<string> = [], target = this.target;
					const notification = this.$makeNotification(LogType.info, this.$t("notification.decompress.title"), this.$t("notification.decompress.message"), 0);
					this.extracting = true;
					try {
						try {
							notification.progress = 0;
							await zip.loadAsync(files[0], { checkCRC32: true });

							// Check if this is a plugin (permitted on Upload&Start, Files -> System, Settings -> Machine, Plugins)
							if ([UploadType.start, UploadType.system, UploadType.update, UploadType.plugin].includes(this.target)) {
								let isPlugin = false;
								zip.forEach(function (file) {
									if (file === "plugin.json") {
										isPlugin = true;
									}
								});

								if (isPlugin) {
									this.$root.$emit(Events.installPlugin, {
										machine: this.machine || store.state.selectedMachine,
										zipFilename: files[0].name,
										zipBlob: files[0],
										zipFile: zip,
										start: this.target === UploadType.start
									});
									return;
								}
								else if (this.target === UploadType.plugin) {
									// Don't proceed if this is no plugin file
									return;
								}
							}

							// Get a list of files to unpack
							zip.forEach(function (file) {
								if (!file.endsWith('/') && (target !== UploadType.filaments || file.split('/').length === 2)) {
									zipFiles.push(file);
								}
							});

							// Could we get anything useful?
							if (zipFiles.length === 0) {
								this.$makeNotification(LogType.error, this.$t(`button.upload.${this.target}.caption`), this.$t("error.uploadNoFiles"));
								return;
							}

							// Do NOT allow index.html.gz to be uploaded in SBC mode (wrong package)
							if (store.state.machine.model.sbc !== null && zipFiles.some(file => file === "index.html.gz")) {
								this.$makeNotification(LogType.error, this.$t(`button.upload.${this.target}.caption`), this.$t("notification.decompress.standaloneUpdateInSbcModeError"));
								return;
							}

							// Extract everything and start the upload
							const extractedFiles: Array<File> = [];
							let filesExtracted = 0;
							for (const name of zipFiles) {
								const blob = await zip.file(name)!.async("blob");
								extractedFiles.push(new File([blob], name));
								notification.progress = Math.round((++filesExtracted / zipFiles.length) * 100);
							}
							this.doUpload(extractedFiles, files[0].name, new Date());
						} finally {
							this.extracting = false;
							notification.close();
						}
						return;
					} catch (e) {
						this.$makeNotification(LogType.error, this.$t("notification.decompress.errorTitle"), getErrorMessage(e));
						throw e;
					}
				}
			}

			if (this.target === UploadType.plugin) {
				// Don't proceed if this is no plugin file
				return;
			}

			// Check what types of files we have and where they need to go
			this.updates.webInterface = false;
			this.updates.firmwareBoards = [];
			this.updates.wifiServer = false;
			this.updates.wifiServerSpiffs = false;
			this.updates.display = false;

			let skipUpload = false;
			for (let i = 0; i < files.length; i++) {
				let content = files[i], filename = Path.combine(this.destinationDirectory, content.name);
				if ([UploadType.firmware, UploadType.system, UploadType.update].includes(this.target)) {
					if (Path.isSdPath('/' + content.name)) {
						filename = Path.combine("0:/", content.name);
					} else if (this.isWebFile(content.name)) {
						filename = Path.combine(store.state.machine.model.directories.web, content.name);
						this.updates.webInterface = this.updates.webInterface || /index.html(\.gz)?/i.test(content.name);
					} else if (store.state.machine.model.sbc !== null && /\.deb$/.test(content.name)) {
						await store.dispatch("machine/installSystemPackage", {
							filename: content.name,
							packageData: content
						});
						skipUpload = true;
					} else {
						const firmwareFileName = this.getFirmwareName(content.name);
						const bootloaderFileName = this.getBinaryName("bootloaderFileName", content.name);
						const iapFileNameSBC = this.getBinaryName("iapFileNameSBC", content.name);
						const iapFileNameSD = this.getBinaryName("iapFileNameSD", content.name);

						if (firmwareFileName) {
							filename = Path.combine(store.state.machine.model.directories.firmware, firmwareFileName);
						} else if (bootloaderFileName) {
							filename = Path.combine(store.state.machine.model.directories.firmware, bootloaderFileName);
						} else if (store.state.machine.model.sbc && iapFileNameSBC) {
							filename = Path.combine(store.state.machine.model.directories.firmware, iapFileNameSBC);
						} else if (iapFileNameSD) {
							filename = Path.combine(store.state.machine.model.directories.firmware, iapFileNameSD);
						} else if (!store.state.machine.model.sbc && store.state.machine.model.network.interfaces.some(iface => iface.type === NetworkInterfaceType.wifi)) {
							if (store.state.machine.model.boards.some(board => board.wifiFirmwareFileName === content.name)) {
								filename = Path.combine(store.state.machine.model.directories.firmware, content.name);
								this.updates.wifiServer = true;
							} else if (/DuetWiFiSocketServer(.*)\.bin/i.test(content.name) || /DuetWiFiServer(.*)\.bin/i.test(content.name)) {
								// Deprecated; will be removed in v3.6
								filename = Path.combine(store.state.machine.model.directories.firmware, "DuetWiFiServer.bin");
								this.updates.wifiServer = true;
							} else if (content.name.endsWith(".bin") || content.name.endsWith(".uf2")) {
								filename = Path.combine(store.state.machine.model.directories.firmware, content.name);
								if (content.name === "PanelDueFirmware.bin" || content.name === "DuetScreen.bin") {
									this.updates.display = true;
								}
							}
						} else if (content.name.endsWith(".bin") || content.name.endsWith(".uf2")) {
							filename = Path.combine(store.state.machine.model.directories.firmware, content.name);
							if (content.name === "PanelDueFirmware.bin" || content.name === "DuetScreen.bin") {
								this.updates.display = true;
							}
						}
					}
				}

				Object.defineProperty(content, "name", {
					writable: true,
					value: filename
				});
			}
			const askForUpdate = (this.updates.firmwareBoards.length > 0) || this.updates.wifiServer || this.updates.wifiServerSpiffs || this.updates.display;

			// Start uploading
			if (skipUpload) {
				return;
			}

			this.uploading = true;
			try {
				if (files.length === 1) {
					await store.dispatch("machine/upload", {
						filename: files[0].name,
						content: files[0],
						showSuccess: !zipName
					});
				} else {
					const filelist = [];
					for (let i = 0; i < files.length; i++) {
						filelist.push({
							filename: files[i].name,
							content: files[i]
						});
					}
					await store.dispatch("machine/upload", {
						files: filelist,
						showSuccess: !zipName,
						closeProgressOnSuccess: askForUpdate
					});
				}
				this.$emit("uploadComplete", files);
			} catch (e) {
				this.uploading = false;
				this.$emit("uploadFailed", { files, error: e });
				return;
			}
			this.uploading = false;

			// Deal with Upload & Start
			if (this.target === UploadType.start) {
				await store.dispatch("machine/sendCode", `M32 "${escapeFilename(files[0].name)}"`);
			}

			// Deal with updates
			if (askForUpdate) {
				// Ask user to perform an update
				this.confirmUpdate = true;
			} else if (store.state.selectedMachine === location.host && this.updates.webInterface) {
				// Reload the web interface immediately if it was the only update
				location.reload(true);
			}

			// Deal with config files
			const configFile = Path.combine(store.state.machine.model.directories.system, Path.configFile);
			for (let file of files) {
				const fullName = Path.combine(this.destinationDirectory, file.name);
				if (!isPrinting(store.state.machine.model.state.status) && (fullName === Path.configFile || fullName === configFile || fullName === Path.boardFile)) {
					// Ask for firmware reset when config.g or 0:/sys/board.txt (RRF on LPC) has been replaced
					this.confirmReset = true;
					break;
				}
			}

			// Show success after uploading a ZIP
			if (zipName) {
				const secondsPassed = startTime ? Math.round(((new Date()).getTime() - startTime.getTime()) / 1000) : 0;
				this.$makeNotification(LogType.success, this.$t("notification.upload.success", [zipName, this.$displayTime(secondsPassed)]), null);
			}
		},
		async startUpdate() {
			// Don't show a reset confirmation while updating
			this.confirmReset = false;

			// Update expansion boards
			store.commit("machine/setBoardsBeingUpdated", this.updates.firmwareBoards);
			for (let i = 0; i < this.updates.firmwareBoards.length; i++) {
				const boardToUpdate = this.updates.firmwareBoards[i];
				if (boardToUpdate > 0) {
					store.commit("machine/setBoardBeingUpdated", boardToUpdate);
					try {
						await store.dispatch("machine/sendCode", `M997 B${boardToUpdate}`);
						await this.waitForUpdate();
					} catch (e) {
						if (!(e instanceof DisconnectedError)) {
							console.warn(e);
							this.$log(LogType.error, this.$t("generic.error"), getErrorMessage(e));
						}
					}
				}
			}

			// Update other modules if applicable
			const modules: Array<number> = [];
			if (this.updates.firmwareBoards.includes(0)) {
				modules.push(0);
			}
			if (this.updates.wifiServer) {
				modules.push(1);
			}
			if (this.updates.wifiServerSpiffs) {
				modules.push(2);
			}
			// module 3 means put wifi server into bootloader mode, not supported here
			if (this.updates.display) {
				modules.push(4);
			}

			if (modules.length > 0) {
				store.commit("machine/setBoardBeingUpdated", 0);
				this.updates.codeSent = true;
				try {
					await store.dispatch("machine/sendCode", `M997 S${modules.join(':')}`);
					await this.waitForUpdate();
				} catch (e) {
					if (!(e instanceof DisconnectedError)) {
						console.warn(e);
						this.$log(LogType.error, this.$t("generic.error"), getErrorMessage(e));
					}
				}
			}

			// Update complete
			store.commit("machine/setBoardBeingUpdated", -1);
			store.commit("machine/setBoardsBeingUpdated", []);

			// Ask for a firmware reset if expansion boards but not the main board have been updated
			this.confirmReset = !modules.includes(0) && this.updates.firmwareBoards.some(board => board > 0);
		},
		async waitForUpdate() {
			do {
				// Wait in 2-second intervals until the status is no longer "Updating"
				await new Promise(resolve => setTimeout(resolve, 2000));

				// Stop if the connection has been interrupted
				if (!this.isConnected) {
					return;
				}
			} while (store.state.machine.model.state.status === MachineStatus.updating);
		},
		dragOver(e: DragEvent) {
			if (!this.isBusy) {
				this.innerColor = "success";
			}
		},
		dragLeave(e: DragEvent) {
			this.innerColor = this.color;
		},
		async dragDrop(e: DragEvent) {
			this.innerColor = this.color;
			if (!this.isBusy && e.dataTransfer && e.dataTransfer.files.length) {
				await this.doUpload(e.dataTransfer.files);
			}
		}
	},
	watch: {
		isConnected(to: boolean) {
			if (to && store.state.selectedMachine === location.host && this.updates.codeSent && this.updates.webInterface) {
				// Reload the web interface when the connection could be established again
				location.reload(true);
			}
		}
	}
});
</script>
