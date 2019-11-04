<template>
	<div>
		<v-toolbar>
			<sd-card-btn class="hidden-sm-and-down" :directory="directory" @storageSelected="selectStorage"></sd-card-btn>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down mr-3" :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">mdi-folder-plus</v-icon> {{ $t('button.newDirectory.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :directory="directory" target="gcodes" color="primary"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :headers="headers" :directory.sync="directory" :filelist.sync="filelist" :loading.sync="loading" sort-table="jobs" @directoryLoaded="directoryLoaded" @fileClicked="fileClicked" no-files-text="list.jobs.noJobs">
			<v-progress-linear slot="progress" :indeterminate="fileinfoProgress === -1" :value="(fileinfoProgress / filelist.length) * 100"></v-progress-linear>

			<template #context-menu>
				<v-list-item v-show="isFile && !isPrinting" @click="start">
					<v-icon class="mr-1">mdi-play</v-icon> {{ $t('list.jobs.start') }}
				</v-list-item>
				<v-list-item v-show="isFile && !isPrinting" @click="simulate">
					<v-icon class="mr-1">mdi-fast-forward</v-icon> {{ $t('list.jobs.simulate') }}
				</v-list-item>
				<v-list-item v-show="isFile" @click="view3D">
					<v-icon class="mr-1">mdi-printer-3d</v-icon>3D View
				</v-list-item>
			</template>
		</base-file-list>

		<v-speed-dial v-model="fab" bottom right fixed open-on-hover direction="top" transition="scale-transition" class="hidden-md-and-up">
			<template #activator>
				<v-btn v-model="fab" dark color="primary" fab>
					<v-icon v-if="fab">mdi-close</v-icon>
					<v-icon v-else>mdi-dots-vertical</v-icon>
				</v-btn>
			</template>

			<v-btn fab :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon>mdi-folder-plus</v-icon>
			</v-btn>

			<v-btn fab color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon>mdi-refresh</v-icon>
			</v-btn>

			<upload-btn fab dark :directory="directory" target="gcodes" color="primary">
				<v-icon>mdi-cloud-upload</v-icon>
			</upload-btn>
		</v-speed-dial>

		<new-directory-dialog :shown.sync="showNewDirectory" :directory="directory"></new-directory-dialog>
		<confirm-dialog :shown.sync="startJobDialog.shown" :question="startJobDialog.question" :prompt="startJobDialog.prompt" @confirmed="start(startJobDialog.item)"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

import i18n from '../../i18n'
import { DisconnectedError, InvalidPasswordError } from '../../utils/errors.js'
import Path from '../../utils/path.js'

export default {
	computed: {
		...mapState(["selectedMachine"]),
		...mapState('machine/cache', ['fileInfos']),
		...mapState('machine/model', ['state', 'storages']),
		...mapState('settings', ['language']),
		...mapGetters(['isConnected', 'uiFrozen']),
		...mapGetters('machine/model', ['isPrinting']),
		headers() {
			return [
				{
					text: i18n.t('list.baseFileList.fileName'),
					value: 'name'
				},
				{
					text: i18n.t('list.baseFileList.size'),
					value: 'size',
					unit: 'bytes'
				},
				{
					text: i18n.t('list.baseFileList.lastModified'),
					value: 'lastModified',
					unit: 'date'
				},
				{
					text: i18n.t('list.jobs.height'),
					value: 'height',
					precision: 2,
					unit: 'mm'
				},
				{
					text: i18n.t('list.jobs.layerHeight'),
					value: 'layerHeight',
					precision: 2,
					unit: 'mm'
				},
				{
					text: i18n.t('list.jobs.filament'),
					value: 'filament',
					unit: 'filaments'
				},
				{
					text: i18n.t('list.jobs.printTime'),
					value: 'printTime',
					unit: 'time'
				},
				{
					text: i18n.t('list.jobs.simulatedTime'),
					value: 'simulatedTime',
					unit: 'time'
				},
				{
					text: i18n.t('list.jobs.generatedBy'),
					value: 'generatedBy'
				}
			];
		},
		isFile() {
			return (this.selection.length === 1) && !this.selection[0].isDirectory;
		},
		loading: {
			get() { return this.loadingValue || this.fileinfoProgress !== -1; },
			set(value) { this.loadingValue = value; }
		}
	},
	data() {
		return {
			directory: Path.gcodes,
			selection: [],
			filelist: [],
			loadingValue: false,
			fileinfoDirectory: undefined,
			fileinfoProgress: -1,
			startJobDialog: {
				question: '',
				prompt: '',
				item: undefined,
				shown: false
			},
			showNewDirectory: false,
			fab: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode', 'getFileInfo']),
		...mapMutations('machine/cache', ['clearFileInfo', 'setFileInfo']),
		async selectStorage(index) {
			const storage = this.storages[index];
			let mountSuccess = true, mountResponse;
			if (storage.mounted) {
				this.directory = (index === 0) ? Path.gcodes : `${index}:`;
			} else {
				this.loading = true;
				try {
					// Mount storage
					mountResponse = await this.sendCode({ code: `M21 P${index}`, log: false });
				} catch (e) {
					mountResponse = e.message;
					mountSuccess = false;
				}

				if (this.isConnected) {
					if (mountSuccess && mountResponse.indexOf('Error') === -1) {
						// Change directory
						this.directory = (index === 0) ? Path.gcodes : `${index}:`;
						this.$log('success', this.$t('notification.mount.successTitle'));
					} else {
						// Show mount message
						this.$log('error', this.$t('notification.mount.errorTitle'), mountResponse);
					}
				}
			}
			this.loading = false;
		},
		refresh() {
			this.clearFileInfo(this.directory);
			this.$refs.filelist.refresh();
		},
		async requestFileInfo(directory, fileIndex, fileCount) {
			if (this.fileinfoDirectory === directory) {
				if (this.isConnected && fileIndex < fileCount) {
					const file = this.filelist[fileIndex];
					if (!file.isDirectory) {
						try {
							// Get the fileinfo either from our cache or from the Duet
							const filename = Path.combine(directory, file.name);
							let fileInfo = this.fileInfos[filename];
							if (!fileInfo) {
								fileInfo = await this.getFileInfo(filename);
								this.setFileInfo({ filename, fileInfo });
							}

							// Start again if the number of files has changed
							if (fileCount !== this.filelist.length) {
								fileIndex = -1;
								fileCount = this.filelist.length;
								return;
							}

							// Set file info
							file.height = fileInfo.height;
							file.layerHeight = fileInfo.layerHeight;
							file.filament = fileInfo.filament;
							file.generatedBy = fileInfo.generatedBy;
							file.printTime = fileInfo.printTime ? fileInfo.printTime : null;
							file.simulatedTime = fileInfo.simulatedTime ? fileInfo.simulatedTime : null;

							// Update progress
							this.fileinfoProgress = fileIndex;
						} catch (e) {
							// Invalidate file info
							file.height = null;
							file.layerHeight = null;
							file.filament = [];
							file.generatedBy = null;
							file.printTime = null;
							file.simulatedTime = null;

							// Deal with the error. If the connection has been terminated, the next call will invalidate everything
							if (!(e instanceof DisconnectedError) && !(e instanceof InvalidPasswordError)) {
								console.warn(e);
								this.$log('error', this.$t('error.fileinfoRequestFailed', [file.name]), e.message);
							}
						}
					}

					// Move on to the next item
					this.fileinfoProgress = fileIndex;
					this.requestFileInfo(directory, fileIndex + 1, fileCount);
				} else {
					// No longer connected or finished
					this.fileinfoProgress = -1;
					this.fileinfoDirectory = undefined;
				}
			}
		},
		directoryLoaded(directory) {
			if (this.fileinfoDirectory !== directory) {
				this.fileinfoDirectory = directory;
				this.filelist.forEach(function(item) {
					if (item.isDirectory) {
						item.height = null;
						item.layerHeight = null;
						item.filament = null;
						item.generatedBy = null;
						item.printTime = null;
						item.simulatedTime = null;
					}
				});

				this.requestFileInfo(directory, 0, this.filelist.length);
			}
		},
		fileClicked(item) {
			if (!this.isPrinting) {
				this.startJobDialog.question = this.$t('dialog.startJob.title', [item.name]);
				this.startJobDialog.prompt = this.$t('dialog.startJob.prompt', [item.name]);
				this.startJobDialog.item = item;
				this.startJobDialog.shown = true;
			}
		},
		start(item) {
			this.sendCode(`M32 "${Path.combine(this.directory, (item && item.name) ? item.name : this.selection[0].name)}"`);
		},
		simulate(item) {
			this.sendCode(`M37 P"${Path.combine(this.directory, (item && item.name) ? item.name : this.selection[0].name)}"`);
		},
		view3D(item) {
			var filePath = `${Path.combine(this.directory,item && item.name ? item.name : this.selection[0].name)}`;
			window.open("/viewer.html?filepath=" + filePath + "&printerip=" + this.selectedMachine, "_blank","noopener,noreferrer" );
		}
  

	},
	watch:{
		selectedMachine() {
			this.directory = Path.gcodes;
			}
	}
}
</script>
