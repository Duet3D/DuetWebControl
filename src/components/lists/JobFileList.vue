<template>
	<div class="component">
		<v-toolbar>
			<sd-card-btn class="hidden-sm-and-down" :directory="directory" @storageSelected="selectStorage"></sd-card-btn>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down" :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">create_new_folder</v-icon> {{ $t('button.newDirectory.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down" color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :directory="directory" target="gcodes" color="primary"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :headers="headers" :directory.sync="directory" :filelist.sync="filelist" :loading.sync="loading" sort-table="jobs" @directoryLoaded="directoryLoaded" @fileClicked="fileClicked" no-files-text="list.jobs.noJobs">
			<v-progress-linear slot="progress" :indeterminate="fileinfoProgress === -1" :value="(fileinfoProgress / filelist.length) * 100"></v-progress-linear>

			<template slot="context-menu">
				<v-list-tile v-show="isFile && !isPrinting" @click="start">
					<v-icon class="mr-1">play_arrow</v-icon> {{ $t('list.jobs.start') }}
				</v-list-tile>
				<v-list-tile v-show="isFile && !isPrinting" @click="simulate">
					<v-icon class="mr-1">fast_forward</v-icon> {{ $t('list.jobs.simulate') }}
				</v-list-tile>
			</template>
		</base-file-list>

		<v-layout class="hidden-md-and-up mt-2" row wrap justify-space-around>
			<sd-card-btn :directory="directory" @storageSelected="selectStorage"></sd-card-btn>
			<v-btn :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">create_new_folder</v-icon> {{ $t('button.newDirectory.caption') }}
			</v-btn>
			<v-btn color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn :directory="directory" target="gcodes" color="primary"></upload-btn>
		</v-layout>

		<new-directory-dialog :shown.sync="showNewDirectory" :directory="directory"></new-directory-dialog>
		<confirm-dialog :shown.sync="startJobDialog.shown" :question="startJobDialog.question" :prompt="startJobDialog.prompt" @confirmed="start(startJobDialog.item)"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

import i18n from '../../i18n'
import { DisconnectedError } from '../../utils/errors.js'
import Path from '../../utils/path.js'

export default {
	computed: {
		...mapState('machine/model', ['state', 'storages']),
		...mapState('settings', ['language']),
		...mapGetters(['isConnected', 'uiFrozen']),
		...mapGetters('machine/model', ['isPrinting']),
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
			headers: [
				{
					text: () => i18n.t('list.baseFileList.fileName'),
					value: 'name'
				},
				{
					text: () => i18n.t('list.baseFileList.size'),
					value: 'size',
					unit: 'bytes'
				},
				{
					text: () => i18n.t('list.baseFileList.lastModified'),
					value: 'lastModified',
					unit: 'date'
				},
				{
					text: () => i18n.t('list.jobs.height'),
					value: 'height',
					precision: 2,
					unit: 'mm'
				},
				{
					text: () => i18n.t('list.jobs.layerHeight'),
					value: 'layerHeight',
					precision: 2,
					unit: 'mm'
				},
				{
					text: () => i18n.t('list.jobs.filament'),
					value: 'filament',
					unit: 'filaments'
				},
				{
					text: () => i18n.t('list.jobs.printTime'),
					value: 'printTime',
					unit: 'time'
				},
				{
					text: () => i18n.t('list.jobs.simulatedTime'),
					value: 'simulatedTime',
					unit: 'time'
				},
				{
					text: () => i18n.t('list.jobs.generatedBy'),
					value: 'generatedBy'
				}
			],
			loadingValue: false,
			fileinfoDirectory: undefined,
			fileinfoProgress: -1,
			startJobDialog: {
				question: '',
				prompt: '',
				item: undefined,
				shown: false
			},
			showNewDirectory: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode', 'getFileInfo']),
		...mapMutations('machine/cache', ['clearFileInfo']),
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
					let height = null, layerHeight = null, filament = [], generatedBy = null, printTime = null, simulatedTime = null;

					this.fileinfoProgress = fileIndex;
					try {
						// Request file info
						if (!file.isDirectory) {
							const fileInfo = await this.getFileInfo(Path.combine(directory, file.name));

							// Start again if the number of files has changed
							if (fileCount !== this.filelist.length) {
								this.fileinfoProgress = 0;
								this.$nextTick(() => this.requestFileInfo(directory, 0, this.filelist.length));
								return;
							}

							// Set file info
							height = fileInfo.height;
							layerHeight = fileInfo.layerHeight;
							filament = fileInfo.filament;
							generatedBy = fileInfo.generatedBy;
							if (fileInfo.printTime) { printTime = fileInfo.printTime; }
							if (fileInfo.simulatedTime) { simulatedTime = fileInfo.simulatedTime; }
						}
					} catch (e) {
						if (e instanceof DisconnectedError) {
							this.fileinfoProgress = -1;
							this.fileinfoDirectory = undefined;
							return;
						}

						console.warn(e);
						this.$log('error', this.$t('error.fileinfoRequestFailed', [file.name]), e.message);
					}

					// Set file info
					file.height = height;
					file.layerHeight = layerHeight;
					file.filament = filament;
					file.generatedBy = generatedBy;
					file.printTime = printTime;
					file.simulatedTime = simulatedTime;

					// Move on to the next item
					await this.requestFileInfo(directory, fileIndex + 1, fileCount);
				} else {
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
		}
	}
}
</script>
