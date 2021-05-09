<style scoped>
table {
	width: 100%;
}

tr {
	height: 2em;
}

th, td {
	text-align: left;
	white-space: nowrap;
}
td {
	vertical-align: middle;
}
</style>

<template>
	<v-dialog :value="shown" max-width="720px" persistent scrollable no-click-animation>
		<v-card>
			<v-card-title>
				<span class="headline">{{ title }}</span>
			</v-card-title>

			<v-card-text>
				<table ref="fileTable" class="mt-3">
					<thead>
						<th>{{ $t('dialog.fileTransfer.filename') }}</th>
						<th class="px-3">{{ $t('dialog.fileTransfer.size') }}</th>
						<th>{{ $t('dialog.fileTransfer.progress') }}</th>
					</thead>
					<tbody>
						<tr v-for="file in files" :key="file.name">
							<td width="50%">
								<v-icon small class="mr-1">{{ getFileIcon(file) }}</v-icon>
								{{ file.filename.substring(fileNameOffset) }}
							</td>
							<td class="px-3" width="15%">
								{{ getSize(file) }}
							</td>
							<td class="py-1" width="35%">
								<v-progress-linear v-show="file.startTime !== null || file.progress > 0" :color="getProgressColor(file)" height="1.25em"
									:value="file.progress * 100" :indeterminate="!file.speed" rounded striped>
									<template #default="{ value }">
										<span class="white--text">{{ value.toFixed(0) }} %</span>
									</template>
								</v-progress-linear>
							</td>
						</tr>
					</tbody>
				</table>
			</v-card-text>

			<v-card-actions>
				<span v-show="currentSpeed > 0" class="ml-3 text--secondary text-button">
					{{ $t('dialog.fileTransfer.currentSpeed', [$displaySpeed(currentSpeed || 0)]) }}
				</span>
				<v-spacer></v-spacer>
				<v-btn v-show="canCancel" color="blue darken-1" text @click="cancel">
					{{ $t(isUploading ? 'dialog.fileTransfer.cancelUploads' : 'dialog.fileTransfer.cancelDownloads') }}
				</v-btn>
				<v-btn v-show="transfersFinished" ref="closeButton" color="blue darken-1" text @click="close">
					{{ $t('generic.close') }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import Vue from 'vue'
import { mapState } from 'vuex'

import Events from '../../utils/events.js'

export default {
	computed: {
		...mapState(['selectedMachine']),
		shown() {
			return this.filesBeingTransferred[this.selectedMachine] !== undefined;
		},
		isUploading() {
			return Boolean(this.isMachineUploading[this.selectedMachine]);
		},
		title() {
			if (this.transfersFinished) {
				if (this.files.findIndex(file => file.error) !== -1) {
					return this.$t(this.isUploading ? 'dialog.fileTransfer.uploadFailedTitle' : 'dialog.fileTransfer.downloadFailedTitle');
				}
				return this.$t(this.isUploading ? 'dialog.fileTransfer.uploadDoneTitle' : 'dialog.fileTransfer.downloadDoneTitle');
			}
			
			let fileBeingTransferred = 1, totalProgress = 0;
			for (let i = 0; i < this.files.length; i++) {
				const file = this.files[i];
				if ((file.startTime !== null && !file.progress) || file.progress < 1) {
					totalProgress = (i + file.progress) / this.files.length;
					fileBeingTransferred = i + 1;
					break;
				}
			}

			const translation = this.isUploading ? 'dialog.fileTransfer.uploadingTitle' : 'dialog.fileTransfer.downloadingTitle';
			return this.$t(translation, [fileBeingTransferred, this.files.length, (totalProgress * 100).toFixed(1)]);
		},
		fileNameOffset() {
			return this.fileNameOffsets[this.selectedMachine] || 0;
		},
		currentSpeed() {
			if (this.files.findIndex(file => file.error) === -1) {
				for (let i = 0; i < this.files.length; i++) {
					if (this.files[i].progress < 1 && this.files[i].speed > 0) {
						return this.files[i].speed;
					}
				}
			}
			return null;
		},
		canCancel() {
			return !this.transfersFinished && this.cancellationTokens[this.selectedMachine] !== undefined;
		},
		files() {
			return this.filesBeingTransferred[this.selectedMachine] || [];
		},
		transfersFinished() {
			if (this.files.findIndex(file => file.error) !== -1) {
				return true;
			}
			return this.files.findIndex(file => (file.startTime !== null && !file.progress) || file.progress < 1) === -1;
		}
	},
	data() {
		return {
			isMachineUploading: {},
			cancellationTokens: {},
			closeProgressOnSuccess: {},
			filesBeingTransferred: {},
			fileNameOffsets: {}
		}
	},
	mounted() {
		this.$root.$on(Events.multipleFilesUploading, this.multiUploadStarting);
		this.$root.$on(Events.fileUploaded, this.fileComplete.bind(this));
		this.$root.$on(Events.multipleFilesDownloading, this.multiDownloadStarting);
		this.$root.$on(Events.fileDownloaded, this.fileComplete.bind(this));
	},
	beforeDestroy() {
		this.$root.$off(this.multiFileTransferStarting);
		this.$root.$off(this.fileComplete);
	},
	methods: {
		getSize(file) {
			if (file.size || (file.content && file.content.size)) {
				return this.$displaySize(file.size || file.content.size);
			}
			return '';
		},
		getFileIcon(file) {
			if (file.error) {
				return 'mdi-alert-circle';
			}
			if (file.progress === 1) {
				return 'mdi-check';
			}
			if (file.startTime !== null) {
				return 'mdi-cloud-upload';
			}
			return 'mdi-asterisk';
		},
		getProgressColor(file) {
			if (file.error) {
				return 'error';
			}
			if (file.progress === 1) {
				return 'success';
			}
			return (file.retry > 0) ? 'warning' : 'info';
		},
		cancel() {
			this.cancellationTokens[this.selectedMachine].cancel();
			this.cancellationTokens[this.selectedMachine] = undefined;
		},
		close() {
			this.closeProgressOnSuccess[this.selectedMachine] = undefined;
			this.cancellationTokens[this.selectedMachine] = undefined;
			this.filesBeingTransferred[this.selectedMachine] = undefined;
		},
		multiUploadStarting({ machine, files, showProgress, closeProgressOnSuccess, cancellationToken }) {
			if (showProgress) {
				Vue.set(this.isMachineUploading, machine, true);
				Vue.set(this.closeProgressOnSuccess, machine, closeProgressOnSuccess);
				Vue.set(this.cancellationTokens, machine, cancellationToken);
				Vue.set(this.filesBeingTransferred, machine, files);
				this.setFileNameOffsets(machine, files);
			}
		},
		multiDownloadStarting({ machine, files, showProgress, closeProgressOnSuccess, cancellationToken }) {
			if (showProgress) {
				Vue.set(this.isMachineUploading, machine, false);
				Vue.set(this.closeProgressOnSuccess, machine, closeProgressOnSuccess);
				Vue.set(this.cancellationTokens, machine, cancellationToken);
				Vue.set(this.filesBeingTransferred, machine, files);
				Vue.set(this.retries, machine, []);
				this.setFileNameOffsets(machine, files);
			}
		},
		setFileNameOffsets(machine, files) {
			Vue.set(this.fileNameOffsets, machine, 0);
			if (files.length > 1) {
				let offset = 0;
				do {
					if (files[0].filename.length <= offset) {
						break;
					}

					const nextChar = files[0].filename[offset];
					for (let k = 1; k < files.length; k++) {
						if (files[k].filename.length <= offset || files[k].filename[offset] !== nextChar) {
							// Exceeding filename length or character mismatch, stop here
							return;
						}
					}

					if (nextChar === '/') {
						this.fileNameOffsets[machine] = offset + 1;
					}
					offset++;
				} while (offset > 0);
			}
		},
		fileComplete({ machine, num, count }) {
			if (this.selectedMachine === machine && num + 1 === count && this.closeProgressOnSuccess[machine]) {
				this.close();
			} else if (this.$refs.fileTable) {
				if (this.$refs.fileTable.rows.length > num + 1) {
					this.$refs.fileTable.rows[num + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
				} else {
					this.$refs.fileTable.rows[this.$refs.fileTable.rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}
		}
	}
}
</script>
