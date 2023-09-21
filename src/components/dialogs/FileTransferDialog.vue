<style scoped>
table {
	width: 100%;
}

tr {
	height: 2em;
}

th,
td {
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
				<span class="headline">
					{{ title }}
				</span>
			</v-card-title>

			<v-card-text>
				<table ref="fileTable" class="mt-3">
					<thead>
						<th>{{ $t("dialog.fileTransfer.filename") }}</th>
						<th class="px-3">{{ $t("dialog.fileTransfer.size") }}</th>
						<th>{{ $t("dialog.fileTransfer.progress") }}</th>
					</thead>
					<tbody>
						<tr v-for="file in files" :key="file.filename">
							<td width="50%">
								<v-icon small class="mr-1">{{ getFileIcon(file) }}</v-icon>
								{{ file.filename.substring(fileNameOffset) }}
							</td>
							<td class="px-3" width="15%">
								{{ getSize(file) }}
							</td>
							<td class="py-1" width="35%">
								<v-progress-linear v-show="file.startTime !== null || file.progress > 0"
												   :color="getProgressColor(file)" height="1.25em"
												   :value="file.progress * 100"
												   :indeterminate="file.progress < 1 && !file.speed && !file.error" rounded
												   striped>
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
				<span v-show="(currentSpeed !== null) && (currentSpeed > 0)" class="ml-3 text--secondary text-button">
					{{ $t("dialog.fileTransfer.currentSpeed", [$displayTransferSpeed(currentSpeed)]) }}
				</span>
				<v-spacer />
				<v-btn v-show="canCancel" color="blue darken-1" variant="text" @click="cancel">
					{{ $t(isUploading ? "dialog.fileTransfer.cancelUploads" : "dialog.fileTransfer.cancelDownloads") }}
				</v-btn>
				<v-btn v-show="transfersFinished" ref="closeButton" color="blue darken-1" variant="text" @click="close">
					{{ $t("generic.close") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent } from "vue"

import Events from "@/utils/events"
import { FileTransferItem } from "@/store/machine";
import { CancellationToken } from "@/store/connector/BaseConnector";
import { displaySize } from "@/utils/display";

export default defineComponent({
	computed: {
		shown(): boolean {
			return this.files.length > 0;
		},
		title(): string {
			if (this.transfersFinished) {
				if (this.files.findIndex(file => file.error) !== -1) {
					return this.$t(this.isUploading ? "dialog.fileTransfer.uploadFailedTitle" : "dialog.fileTransfer.downloadFailedTitle");
				}
				return this.$t(this.isUploading ? "dialog.fileTransfer.uploadDoneTitle" : "dialog.fileTransfer.downloadDoneTitle");
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

			const translation = this.isUploading ? "dialog.fileTransfer.uploadingTitle" : "dialog.fileTransfer.downloadingTitle";
			return this.$t(translation, [fileBeingTransferred, this.files.length, (totalProgress * 100).toFixed(1)]);
		},
		currentSpeed(): number | null {
			if (!this.files.some(file => file.error)) {
				for (let i = 0; i < this.files.length; i++) {
					if (this.files[i].progress < 1 && this.files[i].speed) {
						return this.files[i].speed;
					}
				}
			}
			return null;
		},
		canCancel(): boolean {
			return !this.transfersFinished && (this.cancellationToken !== null);
		},
		transfersFinished(): boolean {
			if (this.files.some(file => file.error)) {
				return true;
			}
			return !this.files.some(file => (file.startTime === null) || (file.progress === null) || (file.progress < 1));
		}
	},
	data() {
		return {
			isUploading: false,
			cancellationToken: null as CancellationToken | null,
			closeProgressOnSuccess: false,
			files: new Array<FileTransferItem>(),
			fileNameOffset: 0,
			retry: 0
		}
	},
	mounted() {
		Events.on("multipleFilesDownloading", this.multiDownloadStarting);
		Events.on("multipleFilesUploading", this.multiUploadStarting);
		Events.on("fileUploaded", this.fileComplete);
		Events.on("fileDownloaded", this.fileComplete);
	},
	beforeDestroy() {
		Events.off("multipleFilesDownloading", this.multiDownloadStarting);
		Events.off("multipleFilesUploading", this.multiDownloadStarting);
		Events.off("fileUploaded", this.fileComplete);
		Events.off("fileDownloaded", this.fileComplete);
	},
	methods: {
		getSize(file: FileTransferItem) {
			if (file.size || (file.content && file.content.size)) {
				return displaySize(file.size || file.content.size);
			}
			return "";
		},
		getFileIcon(file: FileTransferItem) {
			if (file.error) {
				return "mdi-alert-circle";
			}
			if (file.progress === 1) {
				return "mdi-check";
			}
			if (file.startTime !== null) {
				return "mdi-cloud-upload";
			}
			return "mdi-asterisk";
		},
		getProgressColor(file: FileTransferItem) {
			if (file.error) {
				return "error";
			}
			if (file.progress === 1) {
				return "success";
			}
			return (file.retry > 0) ? "warning" : "info";
		},
		cancel() {
			if (this.cancellationToken !== null) {
				this.cancellationToken.cancel();
				this.cancellationToken = null;
			}
		},
		close() {
			this.closeProgressOnSuccess = false;
			this.cancellationToken = null;
			this.files = [];
			this.fileNameOffset = 0;
		},
		multiUploadStarting({ files, showProgress, closeProgressOnSuccess, cancellationToken }: { files: Array<FileTransferItem>, showProgress: boolean, closeProgressOnSuccess: boolean, cancellationToken: CancellationToken }) {
			if (showProgress) {
				this.isUploading = true;
				this.closeProgressOnSuccess = closeProgressOnSuccess;
				this.cancellationToken = cancellationToken;
				this.retry = 0;
				this.setFiles(files);
			}
		},
		multiDownloadStarting({ files, showProgress, closeProgressOnSuccess, cancellationToken }: { files: Array<FileTransferItem>, showProgress: boolean, closeProgressOnSuccess: boolean, cancellationToken: CancellationToken }) {
			if (showProgress) {
				this.isUploading = false;
				this.closeProgressOnSuccess = closeProgressOnSuccess;
				this.cancellationToken = cancellationToken;
				this.retry = 0;
				this.setFiles(files);
			}
		},
		setFiles(files: Array<FileTransferItem>) {
			this.files = files;
			this.fileNameOffset = 0;
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

					if (nextChar === "/") {
						this.fileNameOffset = offset + 1;
					}
					offset++;
				} while (offset > 0);
			}
		},
		fileComplete({ num, count }: { num: number, count: number }) {
			if (num + 1 === count && this.closeProgressOnSuccess) {
				this.close();
			} else if (this.$refs.fileTable) {
				const fileTable = this.$refs.fileTable as HTMLTableElement;
				if (fileTable.rows.length > num + 1) {
					fileTable.rows[num + 1].scrollIntoView({ behavior: "smooth", block: "center" });
				} else if (fileTable.rows.length > 0) {
					fileTable.rows[fileTable.rows.length - 1].scrollIntoView({ behavior: "smooth", block: "center" });
				}
			}
		}
	}
});
</script>
