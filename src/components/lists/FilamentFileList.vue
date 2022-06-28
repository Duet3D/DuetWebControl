<template>
	<div class="component">
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down mr-3" v-show="!isRootDirectory" :disabled="uiFrozen" :elevation="1" @click="showNewFile = true">
				<v-icon class="mr-1">mdi-file-plus</v-icon> {{ $t('button.newFile.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" v-show="isRootDirectory" :disabled="uiFrozen" :elevation="1" @click="showNewFilament = true">
				<v-icon class="mr-1">mdi-database-plus</v-icon> {{ $t('button.newFilament.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" color="info" :loading="loading" :disabled="uiFrozen" :elevation="1" @click="refresh">
				<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :elevation="1" target="filaments" color="primary"></upload-btn>
		</v-toolbar>

		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :folder-icon="isRootDirectory ? 'mdi-radiobox-marked' : 'mdi-folder'" :loading.sync="loading" :doingFileOperation="doingFileOperation" sort-table="filaments" @fileClicked="fileClicked" :no-delete="isRootDirectory" :no-rename="filamentSelected" no-drag-drop :no-files-text="isRootDirectory ? 'list.filament.noFilaments' : 'list.baseFileList.noFiles'">
			<template #context-menu>
				<v-list-item v-show="filamentSelected" @click="downloadFilament">
					<v-icon class="mr-1">mdi-cloud-download</v-icon> {{ $t('list.baseFileList.downloadZIP') }}
				</v-list-item>
				<v-list-item v-show="filamentSelected" @click="rename">
					<v-icon class="mr-1">mdi-rename-box</v-icon> {{ $t('list.baseFileList.rename') }}
				</v-list-item>
				<v-list-item v-show="filamentSelected" @click="remove">
					<v-icon class="mr-1">mdi-delete</v-icon> {{ $t('list.baseFileList.delete') }}
				</v-list-item>
			</template>
		</base-file-list>

		<v-speed-dial v-model="fab" bottom right fixed direction="top" transition="scale-transition" class="hidden-md-and-up">
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

		<new-directory-dialog :shown.sync="showNewFilament" :directory="directory" :title="$t('dialog.newFilament.title')" :prompt="$t('dialog.newFilament.prompt')" :showSuccess="false" :showError="false" @directoryCreationFailed="directoryCreationFailed" @directoryCreated="createFilamentFiles"></new-directory-dialog>
		<new-file-dialog :shown.sync="showNewFile" :directory="directory"></new-file-dialog>
	</div>
</template>

<script>
'use strict'

import JSZip from 'jszip'
import saveAs from 'file-saver'

import { mapState, mapGetters, mapActions } from 'vuex'

import { DisconnectedError, FileNotFoundError, OperationCancelledError } from '@/utils/errors.js'
import Path from '@/utils/path.js'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', {
			filamentsDirectory: state => state.directories.filaments,
			tools: state => state.tools
		}),
		isRootDirectory() { return Path.equals(this.directory, this.filamentsDirectory); },
		filamentSelected() { return Path.equals(this.directory, this.filamentsDirectory) && (this.selection.length === 1) && this.selection[0].isDirectory; }
	},
	data() {
		return {
			directory: Path.filaments,
			selection: [],
			loading: false,
			doingFileOperation: false,
			showNewFile: false,
			showNewFilament: false,
			fab: false
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
		async refresh() {
			await this.$refs.filelist.refresh();
		},
		async downloadFilament() {
			const filament = this.selection[0].name;

			// Download the files first
			let loadG, unloadG;
			try {
				loadG = await this.download({ filename: Path.combine(Path.filaments, filament, 'load.g'), type: 'blob', showSuccess: false, showError: false });
				unloadG = await this.download({ filename: Path.combine(Path.filaments, filament, 'unload.g'), type: 'blob', showSuccess: false, showError: false });
			} catch (e) {
				if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
					this.$makeNotification('error', this.$t('notification.download.error', [!loadG ? 'load.g' : 'unload.g']), e.message);
				}
				return;
			}

			let configG;
			try {
				configG = await this.download({ filename: Path.combine(Path.filaments, filament, 'config.g'), type: 'blob', showSuccess: false, showError: false });
			} catch (e) {
				// config.g may not exist
				if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError) && !(e instanceof FileNotFoundError)) {
					this.$makeNotification('error', this.$t('notification.download.error', ['config.g']), e.message);
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
				const zipBlob = await zip.generateAsync({ type: 'blob' });
				saveAs(zipBlob, `${filament}.zip`);
			} catch (e) {
				console.warn(e);
				this.$makeNotification('error', this.$t('notification.compress.errorTitle', ['load.g']), e.message);
			}
		},
		async rename() {
			const filament = this.selection[0].name;
			if (this.tools.some(tool => tool && tool.filament === filament)) {
				this.$makeNotification('error', this.$t('notification.renameFilament.errorTitle'), this.$t('notification.renameFilament.errorStillLoaded'));
				return;
			}

			await this.$refs.filelist.rename(this.selection[0]);
		},
		async remove(items) {
			if (!items || !(items instanceof Array)) {
				items = this.selection.slice();
			}

			if (items.some(item => item.isDirectory && this.tools.some(tool => tool && tool.filament === item.name))) {
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
					await this.delete(Path.combine(Path.filaments, items[i].name));
					await this.refresh();
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
}
</script>
