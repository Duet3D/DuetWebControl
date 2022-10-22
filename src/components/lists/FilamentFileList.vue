<template>
	<div class="component">
		<v-toolbar>
			<directory-breadcrumbs v-model="directory" />

			<v-spacer />

			<v-btn class="hidden-sm-and-down mr-3" v-show="!isRootDirectory" :disabled="uiFrozen" :elevation="1"
				   @click="showNewFile = true">
				<v-icon class="mr-1">mdi-file-plus</v-icon> {{ $t("button.newFile.caption") }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" v-show="isRootDirectory" :disabled="uiFrozen" :elevation="1"
				   @click="showNewFilament = true">
				<v-icon class="mr-1">mdi-database-plus</v-icon> {{ $t("button.newFilament.caption") }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" color="info" :loading="loading" :disabled="uiFrozen" :elevation="1"
				   @click="refresh">
				<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t("button.refresh.caption") }}
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :elevation="1" target="filaments" color="primary" />
		</v-toolbar>

		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory"
						:folder-icon="isRootDirectory ? 'mdi-radiobox-marked' : 'mdi-folder'" :loading.sync="loading"
						:doingFileOperation="doingFileOperation" sort-table="filaments" @fileClicked="fileClicked"
						:no-delete="isRootDirectory" :no-rename="filamentSelected" no-drag-drop
						:no-files-text="isRootDirectory ? 'list.filament.noFilaments' : 'list.baseFileList.noFiles'">
			<template #context-menu>
				<v-list-item v-show="filamentSelected" @click="downloadFilament">
					<v-icon class="mr-1">mdi-cloud-download</v-icon> {{ $t("list.baseFileList.downloadZIP") }}
				</v-list-item>
				<v-list-item v-show="filamentSelected" @click="rename">
					<v-icon class="mr-1">mdi-rename-box</v-icon> {{ $t("list.baseFileList.rename") }}
				</v-list-item>
				<v-list-item v-show="filamentSelected" @click="remove">
					<v-icon class="mr-1">mdi-delete</v-icon> {{ $t("list.baseFileList.delete") }}
				</v-list-item>
			</template>
		</base-file-list>

		<v-speed-dial v-model="fab" bottom right fixed direction="top" transition="scale-transition"
					  class="hidden-md-and-up">
			<template #activator>
				<v-btn v-model="fab" dark color="primary" fab>
					<v-icon v-if="fab">mdi-close</v-icon>
					<v-icon v-else>mdi-dots-vertical</v-icon>
				</v-btn>
			</template>

			<v-btn v-show="!isRootDirectory" fab :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">mdi-file-plus</v-icon>
			</v-btn>

			<v-btn v-show="isRootDirectory" fab :disabled="uiFrozen" @click="showNewFilament = true">
				<v-icon>mdi-database-plus</v-icon>
			</v-btn>

			<v-btn fab color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon>mdi-refresh</v-icon>
			</v-btn>

			<upload-btn fab dark :directory="directory" target="filaments" color="primary">
				<v-icon>mdi-cloud-upload</v-icon>
			</upload-btn>
		</v-speed-dial>

		<new-directory-dialog :shown.sync="showNewFilament" :directory="directory"
							  :title="$t('dialog.newFilament.title')" :prompt="$t('dialog.newFilament.prompt')"
							  :showSuccess="false" :showError="false" @directoryCreationFailed="directoryCreationFailed"
							  @directoryCreated="createFilamentFiles" />
		<new-file-dialog :shown.sync="showNewFile" :directory="directory" />
	</div>
</template>

<script lang="ts">
import saveAs from "file-saver";
import JSZip from "jszip";
import Vue from "vue";

import store from "@/store";
import { DisconnectedError, FileNotFoundError, getErrorMessage, OperationCancelledError } from "@/utils/errors";
import Path from "@/utils/path";
import { LogType } from "@/utils/logging";

import { BaseFileListItem } from "./BaseFileList.vue";
import { FileListItem } from "@/store/machine/connector/BaseConnector";

export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		isRootDirectory(): boolean {
			return Path.equals(this.directory, store.state.machine.model.directories.filaments);
		},
		filamentsDirectory(): string {
			return store.state.machine.model.directories.filaments;
		},
		filamentSelected(): boolean {
			return Path.equals(this.directory, this.filamentsDirectory) && (this.selection.length === 1) && this.selection[0].isDirectory;
		}
	},
	data() {
		return {
			directory: Path.filaments,
			selection: new Array<BaseFileListItem>,
			loading: false,
			doingFileOperation: false,
			showNewFile: false,
			showNewFilament: false,
			fab: false
		}
	},
	methods: {
		directoryCreationFailed(error: any) {
			this.$makeNotification(LogType.error, this.$t('notification.newFilament.errorTitle'), getErrorMessage(error));
		},
		async createFilamentFiles(path: string) {
			if (this.doingFileOperation) {
				return;
			}

			this.doingFileOperation = true;
			try {
				const emptyFile = new Blob();
				await store.dispatch("machine/upload", { filename: Path.combine(path, "load.g"), content: emptyFile, showSuccess: false });
				await store.dispatch("machine/upload", { filename: Path.combine(path, "config.g"), content: emptyFile, showSuccess: false });
				await store.dispatch("machine/upload", { filename: Path.combine(path, "unload.g"), content: emptyFile, showSuccess: false });
				this.$makeNotification(LogType.success, this.$t("notification.newFilament.successTitle"), this.$t("notification.newFilament.successMessage", [Path.extractFileName(path)]));
			} catch (e) {
				console.warn(e);
				this.$makeNotification(LogType.error, this.$t("notification.newFilament.errorTitleMacros"), getErrorMessage(e));
			}
			this.doingFileOperation = false;
		},
		async refresh() {
			await (this.$refs.filelist as any).refresh();
		},
		async downloadFilament() {
			const filament = this.selection[0].name;

			// Download the files first
			let loadG, unloadG;
			try {
				loadG = await store.dispatch("machine/download", { filename: Path.combine(Path.filaments, filament, "load.g"), type: "blob", showSuccess: false, showError: false });
				unloadG = await store.dispatch("machine/download", { filename: Path.combine(Path.filaments, filament, "unload.g"), type: "blob", showSuccess: false, showError: false });
			} catch (e) {
				if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
					this.$makeNotification(LogType.error, this.$t("notification.download.error", [!loadG ? "load.g" : "unload.g"]), getErrorMessage(e));
				}
				return;
			}

			let configG;
			try {
				configG = await store.dispatch("machine/download", { filename: Path.combine(Path.filaments, filament, "config.g"), type: "blob", showSuccess: false, showError: false });
			} catch (e) {
				// config.g may not exist
				if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError) && !(e instanceof FileNotFoundError)) {
					this.$makeNotification(LogType.error, this.$t("notification.download.error", ["config.g"]), getErrorMessage(e));
				}
			}

			// Bundle them in a ZIP file and pass it to the user
			const zip = new JSZip();
			zip.file(`${filament}/load.g`, loadG);
			zip.file(`${filament}/unload.g`, unloadG);
			if (configG) {
				zip.file(`${filament}/config.g`, configG);
			}

			try {
				const zipBlob = await zip.generateAsync({ type: "blob" });
				saveAs(zipBlob, `${filament}.zip`);
			} catch (e) {
				console.warn(e);
				this.$makeNotification(LogType.error, this.$t("notification.compress.errorTitle", ["load.g"]), getErrorMessage(e));
			}
		},
		async rename() {
			const filament = this.selection[0].name;
			if (store.state.machine.model.move.extruders.some(extruder => extruder.filament === filament)) {
				this.$makeNotification(LogType.error, this.$t("notification.renameFilament.errorTitle"), this.$t("notification.renameFilament.errorStillLoaded"));
				return;
			}

			await (this.$refs.filelist as any).rename(this.selection[0]);
		},
		async remove(items?: Array<BaseFileListItem>) {
			if (!items) {
				items = this.selection.slice();
			}

			if (items.some(item => item.isDirectory && store.state.machine.model.move.extruders.some(extruder => extruder.filament === item.name))) {
				this.$makeNotification(LogType.error, this.$t("notification.deleteFilament.errorTitle"), this.$t("notification.deleteFilament.errorStillLoaded"));
				return;
			}

			if (this.doingFileOperation) {
				return;
			}

			this.doingFileOperation = true;
			for(const item of items) {
				try {
					if (item.isDirectory) {
						// Get files from the filament directory
						const files: Array<FileListItem> = await store.dispatch("machine/getFileList", Path.combine(Path.filaments, item.name));
						if (files.some(file => file.isDirectory)) {
							this.$makeNotification(LogType.error, this.$t("notification.deleteFilament.errorTitle"), this.$t("notification.deleteFilament.errorSubDirectories", [item.name]));
							break;
						}

						// Delete each file from the directory
						for (const file of files) {
							await store.dispatch("machine/delete", Path.combine(Path.filaments, item.name, file.name));
						}
					}

					// Delete the item
					await store.dispatch("machine/delete", Path.combine(Path.filaments, item.name));
					await this.refresh();
				} catch (e) {
					if (!(e instanceof DisconnectedError)) {
						console.warn(e);
						this.$makeNotification(LogType.error, this.$t('notification.deleteFilament.errorTitle'), getErrorMessage(e));
					}
					break;
				}
			}
			this.doingFileOperation = false;
		},
		fileClicked(item: BaseFileListItem) {
			(this.$refs.filelist as any).edit(item);
		}
	},
	mounted() {
		this.directory = this.filamentsDirectory;
	},
	watch: {
		filamentsDirectory(to, from) {
			if (Path.equals(this.directory, from) || !Path.startsWith(this.directory, to)) {
				this.directory = to;
			}
		}
	}
});
</script>
