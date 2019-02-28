<template>
	<div class="component">
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down" v-show="!isRootDirectory" :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">add</v-icon> {{ $t('button.newFile.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down" v-show="isRootDirectory" :disabled="uiFrozen" @click="showNewFilament = true">
				<v-icon class="mr-1">create_new_folder</v-icon> {{ $t('button.newFilament.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down" color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn class="hidden-sm-and-down" target="filaments" color="primary"></upload-btn>
		</v-toolbar>

		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" :doingFileOperation="doingFileOperation" sort-table="filaments" @fileClicked="fileClicked" :no-delete="isRootDirectory" :no-rename="filamentSelected" no-drag-drop>
			<template slot="no-data">
				<v-alert :value="true" type="info" class="ma-0" @contextmenu.prevent="">
					{{ isRootDirectory ? $t('list.filament.noFilaments') : $t('list.baseFileList.noFiles') }}
				</v-alert>
			</template>

			<template slot="context-menu">
				<v-list-tile v-show="filamentSelected" @click="downloadFilament">
					<v-icon class="mr-1">cloud_download</v-icon> {{ $t('list.baseFileList.downloadZIP') }}
				</v-list-tile>
				<v-list-tile v-show="filamentSelected" @click="rename">
					<v-icon class="mr-1">short_text</v-icon> {{ $t('list.baseFileList.rename') }}
				</v-list-tile>
				<v-list-tile @click="remove">
					<v-icon class="mr-1">delete</v-icon> {{ $t('list.baseFileList.delete') }}
				</v-list-tile>
			</template>
		</base-file-list>

		<v-layout class="hidden-md-and-up mt-2" row wrap justify-space-around>
			<v-btn v-show="!isRootDirectory" :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">add</v-icon> {{ $t('button.newFile.caption') }}
			</v-btn>
			<v-btn v-show="isRootDirectory" :disabled="uiFrozen" @click="showNewFilament = true">
				<v-icon class="mr-1">create_new_folder</v-icon> {{ $t('button.newFilament.caption') }}
			</v-btn>
			<v-btn color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn target="filaments" color="primary"></upload-btn>
		</v-layout>

		<new-directory-dialog :shown.sync="showNewFilament" :directory="directory" :title="$t('dialog.newFilament.title')" :prompt="$t('dialog.newFilament.prompt')" :showSuccess="false" :showError="false" @directoryCreationFailed="directoryCreationFailed" @directoryCreated="createFilamentFiles"></new-directory-dialog>
		<new-file-dialog :shown.sync="showNewFile" :directory="directory"></new-file-dialog>
	</div>
</template>

<script>
'use strict'

import JSZip from 'jszip'
import saveAs from 'file-saver'

import { mapState, mapGetters, mapActions } from 'vuex'

import { DisconnectedError, OperationCancelledError } from '../../utils/errors.js'
import Path from '../../utils/path.js'

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', ['tools']),
		isRootDirectory() { return this.directory === Path.filaments; },
		filamentSelected() { return (this.directory === Path.filaments) && (this.selection.length === 1) && this.selection[0].isDirectory; }
	},
	data() {
		return {
			directory: Path.filaments,
			selection: [],
			loading: false,
			doingFileOperation: false,
			showNewFile: false,
			showNewFilament: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode', 'upload', 'download', 'delete', 'getFileList']),
		directoryCreationFailed(error) {
			this.$makeNotification('error', this.$t('notification.newFilament.errorTitle'), error.message);
		},
		async createFilamentFiles(path) {
			if (this.doingFileOperation) {
				return;
			}

			this.doingFileOperation = true;
			try {
				console.log(path);
				const emptyFile = new Blob();
				await this.upload({ filename: Path.combine(path, 'load.g'), content: emptyFile, showSuccess: false });
				await this.upload({ filename: Path.combine(path, 'config.g'), content: emptyFile, showSuccess: false });
				await this.upload({ filename: Path.combine(path, 'unload.g'), content: emptyFile, showSuccess: false });
				this.$makeNotification('success', this.$t('notification.newFilament.successTitle'), this.$t('notification.newFilament.successMessage', [Path.extractFileName(path)]));
			} catch (e) {
				console.warn(e);
				this.$makeNotification('error', this.$t('notification.newFilament.errorTitleMacros'), e.message);
			}
			this.doingFileOperation = false;
		},
		refresh() {
			this.$refs.filelist.refresh();
		},
		async downloadFilament() {
			const filament = this.selection[0].name;

			let loadG, configG, unloadG;
			try {
				loadG = await this.download({ filename: Path.combine(Path.filaments, filament, 'load.g'), showSuccess: false, showError: false });
			} catch (e) {
				if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
					this.$makeNotification('error', this.$t('notification.download.error', ['load.g']), e.message);
				}
				return;
			}
			try {
				unloadG = await this.download({ filename: Path.combine(Path.filaments, filament, 'unload.g'), showSuccess: false, showError: false });
			} catch (e) {
				if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
					this.$makeNotification('error', this.$t('notification.download.error', ['unload.g']), e.message);
				}
				return;
			}
			try {
				configG = await this.download({ filename: Path.combine(Path.filaments, filament, 'config.g'), showSuccess: false, showError: false });
			} catch (e) {
				// config.g may not exist
			}

			const zip = new JSZip();
			zip.file(`${filament}/load.g`, loadG);
			zip.file(`${filament}/unload.g`, unloadG);
			if (configG) {
				zip.file(`${filament}/config.g`, configG);
			}

			try {
				const zipBlob = await zip.generateAsync({ type: 'blob' });
				saveAs(zipBlob, `${filament}.zip`);
			} catch (e) {
				console.warn(e);
				this.$makeNotification('error', this.$t('notification.compress.errorTitle', ['load.g']), e.message);
			}
		},
		async rename() {
			const filament = this.selection[0].name;
			if (this.tools.some(tool => tool.filament === filament)) {
				this.$makeNotification('error', this.$t('notification.renameFilament.errorTitle'), this.$t('notification.renameFilament.errorStillLoaded'));
				return;
			}

			this.$refs.filelist.rename(this.selection[0]);
		},
		async remove(items) {
			if (!items || !(items instanceof Array)) {
				items = this.selection.slice();
			}

			if (items.some(item => item.isDirectory && this.tools.some(tool => tool.filament === item.name))) {
				this.$makeNotification('error', this.$t('notification.deleteFilament.errorTitle'), this.$t('notification.deleteFilament.errorStillLoaded'));
				return;
			}

			if (this.doingFileOperation) {
				return;
			}

			this.doingFileOperation = true;
			for (let i = 0; i < items.length; i++) {
				try {
					if (items[i].isDirectory) {
						// Get files from the filament directory
						const files = await this.getFileList(Path.combine(Path.filaments, items[i].name));
						if (files.some(item => item.isDirectory)) {
							this.$makeNotification('error', this.$t('notification.deleteFilament.errorTitle'), this.$t('notification.deleteFilament.errorSubDirectories', [items[i].name]));
							break;
						}

						// Delete each file from the directory
						for (let k = 0; k < files.length; k++) {
							await this.delete(Path.combine(Path.filaments, items[i].name, files[k].name));
						}
					}

					// Delete the item
					await this.$refs.filelist.remove(items[i]);
				} catch (e) {
					if (!(e instanceof DisconnectedError)) {
						console.warn(e);
						this.$makeNotification('error', this.$t('notification.deleteFilament.errorTitle'), e.message);
					}
					break;
				}
			}
			this.doingFileOperation = false;
		},
		fileClicked(item) {
			this.$refs.filelist.edit(item);
		}
	},
	watch: {
		selectedMachine() {
			this.directory = Path.filaments;
		}
	}
}
</script>
