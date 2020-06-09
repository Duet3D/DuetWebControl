<template>
	<div>
		<v-toolbar>
			<sd-card-btn v-if="volumes.length > 1" v-model="volume" class="hidden-sm-and-down"></sd-card-btn>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down mr-3" :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">mdi-folder-plus</v-icon> {{ $t('button.newDirectory.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" color="info" :loading="loading || fileinfoProgress !== -1" :disabled="uiFrozen" @click="refresh">
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
			</template>
		</base-file-list>

		<v-speed-dial v-model="fab" bottom right fixed direction="top" transition="scale-transition" class="hidden-md-and-up">
			<template #activator>
				<v-btn v-model="fab" dark color="primary" fab>
					<v-icon v-if="fab">mdi-close</v-icon>
					<v-icon v-else>mdi-dots-vertical</v-icon>
				</v-btn>
			</template>

			<v-btn fab :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon>mdi-folder-plus</v-icon>
			</v-btn>

			<v-btn fab color="info" :loading="loading || fileinfoProgress !== -1" :disabled="uiFrozen" @click="refresh">
				<v-icon>mdi-refresh</v-icon>
			</v-btn>

			<upload-btn fab dark :directory="directory" target="gcodes" color="primary">
				<v-icon>mdi-cloud-upload</v-icon>
			</upload-btn>
		</v-speed-dial>

		<new-directory-dialog :shown.sync="showNewDirectory" :directory="directory"></new-directory-dialog>
		<confirm-dialog :shown.sync="startJobDialog.shown" :title="startJobDialog.title" :prompt="startJobDialog.prompt" @confirmed="start(startJobDialog.item)"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

import i18n from '../../i18n'
import { isPrinting } from '../../store/machine/modelEnums.js'
import { DisconnectedError, InvalidPasswordError } from '../../utils/errors.js'
import Path from '../../utils/path.js'

export default {
	computed: {
		...mapState('machine/cache', ['fileInfos']),
		...mapState('machine/model', {
			gCodesDirectory: state => state.directories.gCodes,
			lastJobFile: state => state.job.lastFileName,
			status: state => state.state.status,
			volumes: state => state.volumes
		}),
		...mapState('settings', ['language']),
		...mapGetters(['isConnected', 'uiFrozen']),
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
		isPrinting() {
			return isPrinting(this.status);
		},
		loading: {
			get() { return this.loadingValue || this.fileinfoProgress !== -1; },
			set(value) { this.loadingValue = value; }
		},
		volume: {
			get() { return Path.getVolume(this.directory); },
			set(value) { this.directory = (value === Path.getVolume(this.gCodesDirectory)) ? this.gCodesDirectory : `${value}:`; }
		}
	},
	data() {
		return {
			directory: Path.gCodes,
			selection: [],
			filelist: [],
			loadingValue: false,
			fileinfoDirectory: undefined,
			fileinfoProgress: -1,
			startJobDialog: {
				title: '',
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
		refresh() {
			this.clearFileInfo(this.directory);
			this.$refs.filelist.refresh();
		},
		async requestFileInfo(directory, fileIndex, fileCount) {
			if (this.fileinfoDirectory === directory) {
				if (this.isConnected && fileIndex < fileCount) {
					// Update progress
					this.fileinfoProgress = fileIndex;

					// Try to get file info for the next file
					const file = this.filelist[fileIndex];
					if (!file.isDirectory) {
						let gotFileInfo = false;
						try {
							// Check if it is possible to parse this file
							const filename = Path.combine(directory, file.name);
							if (Path.isGCodePath(file.name, this.gCodesDirectory)) {
								// Get the fileinfo either from our cache or from the Duet
								let fileInfo = this.fileInfos[filename];
								if (!fileInfo) {
									fileInfo = await this.getFileInfo(filename);
									this.setFileInfo({ filename, fileInfo });
								}

								// Start again if the number of files has changed
								if (fileCount !== this.filelist.length) {
									fileIndex = -1;
									fileCount = this.filelist.length;
									this.requestFileInfo(directory, fileIndex, fileCount);
									return;
								}

								// Set file info
								gotFileInfo = true
								file.height = fileInfo.height;
								file.layerHeight = fileInfo.layerHeight;
								file.filament = fileInfo.filament;
								file.generatedBy = fileInfo.generatedBy;
								file.printTime = fileInfo.printTime ? fileInfo.printTime : null;
								file.simulatedTime = fileInfo.simulatedTime ? fileInfo.simulatedTime : null;
							}
						} catch (e) {
							// Deal with the error. If the connection has been terminated, the next call will invalidate everything
							if (!(e instanceof DisconnectedError) && !(e instanceof InvalidPasswordError)) {
								console.warn(e);
								this.$log('error', this.$t('error.fileinfoRequestFailed', [file.name]), e.message);
							}
						}

						// Remove loading state from the items if no info could be found
						if (!gotFileInfo) {
							file.height = null;
							file.layerHeight = null;
							file.filament = [];
							file.generatedBy = null;
							file.printTime = null;
							file.simulatedTime = null;
						}
					}

					// Move on to the next item
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
				this.startJobDialog.title = this.$t('dialog.startJob.title', [item.name]);
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
	},
	mounted() {
		this.directory = this.gCodesDirectory;
	},
	watch: {
		gCodesDirectory(to, from) {
			if (Path.equals(this.directory, from) || !Path.startsWith(this.directory, to)) {
				this.directory = to;
			}
		},
		lastJobFile(to) {
			if (Path.equals(this.directory, Path.extractDirectory(to))) {
				this.$refs.filelist.refresh();
			}
		}
	}
}
</script>
