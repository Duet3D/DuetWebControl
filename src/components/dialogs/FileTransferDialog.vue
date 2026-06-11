<style scoped>
.file-transfer-table {
	width: 100%;
	table-layout: fixed;
}
/* table-layout: fixed reads column widths from the colgroup, not the body cells */
.col-filename {
	width: 50%;
}
.col-size {
	width: 15%;
}
.col-progress {
	width: 35%;
}
.file-transfer-table tr {
	height: 32px;
}
.file-transfer-table th,
.file-transfer-table td {
	text-align: left;
	white-space: nowrap;
}
.file-transfer-table td {
	vertical-align: middle;
}
.filename-cell {
	overflow: hidden;
	text-overflow: ellipsis;
}
.progress-static :deep(.v-progress-linear__determinate) {
	animation: none;
}
</style>

<template>
	<v-dialog v-model="shown" max-width="800" persistent no-click-animation scrollable>
		<v-card>
			<v-card-title>{{ title }}</v-card-title>

			<v-card-text>
				<table class="file-transfer-table mt-3">
					<colgroup>
						<col class="col-filename">
						<col class="col-size">
						<col class="col-progress">
					</colgroup>
					<thead>
						<tr>
							<th>{{ $t("dialog.fileTransfer.filename") }}</th>
							<th class="px-3">{{ $t("dialog.fileTransfer.size") }}</th>
							<th>{{ $t("dialog.fileTransfer.progress") }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(file, index) in files" :key="file.filename" :ref="el => bindRow(el, index)">
							<td class="filename-cell" :title="trimmedName(file)">
								<v-icon size="small" class="me-1">{{ getFileIcon(file) }}</v-icon>
								{{ trimmedName(file) }}
							</td>
							<td class="px-3">{{ formattedSize(file) }}</td>
							<td class="py-1">
								<v-progress-linear v-show="file.startTime !== null || file.progress > 0"
												   :color="getProgressColor(file)" height="16" rounded="md"
												   striped
												   :class="{ 'progress-static': file.progress >= 1 }"
												   :model-value="file.progress * 100"
												   :indeterminate="file.progress < 1 && !file.speed && !file.error">
									<template #default="{ value }">
										<span class="text-white text-body-small">{{ value.toFixed(0) }} %</span>
									</template>
								</v-progress-linear>
							</td>
						</tr>
					</tbody>
				</table>
			</v-card-text>

			<v-card-actions>
				<span v-show="currentSpeed !== null && currentSpeed > 0" class="ms-3 text-medium-emphasis text-body-small">
					{{ $t("dialog.fileTransfer.currentSpeed", [displayTransferSpeed(currentSpeed)]) }}
				</span>
				<v-spacer />
				<v-btn v-show="canCancel" variant="text" @click="cancel">
					{{ isUploading ? $t("dialog.fileTransfer.cancelUploads") : $t("dialog.fileTransfer.cancelDownloads") }}
				</v-btn>
				<v-btn v-show="transfersFinished" variant="text" autofocus @click="close">
					{{ $t("generic.close") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { type CancellationToken, OperationCancelledError } from "@duet3d/connectors";

import type { FileTransferItem } from "@/stores/machine";
import { displaySize, displayTransferSpeed } from "@/utils/display";
import Events from "@/utils/events";
import i18n from "@/i18n";

type MultipleFilesPayload = {
	files: Array<FileTransferItem>;
	showProgress: boolean;
	closeProgressOnSuccess: boolean;
	cancellationToken: CancellationToken;
};
type FileCompletePayload = { num: number; count: number };

// Single global instance: mounted in the default layout, listens to upload/download events from
// machineStore. When a multi-file transfer starts the dialog opens with a per-file progress table
// and closes either on the user's click or automatically when closeProgressOnSuccess is set

const files = ref<Array<FileTransferItem>>([]);
const isUploading = ref(false);
const closeProgressOnSuccess = ref(false);
const cancellationToken = ref<CancellationToken | null>(null);
const fileNameOffset = ref(0);
const rowRefs = ref<Array<HTMLElement | null>>([]);

const shown = computed({
	get: () => files.value.length > 0,
	set: (value) => {
		if (!value) {
			close();
		}
	},
});

const transfersFinished = computed(() => {
	if (files.value.some(file => file.error)) {
		return true;
	}
	return !files.value.some(file => file.startTime === null || file.progress < 1);
});

const canCancel = computed(() => !transfersFinished.value && cancellationToken.value !== null);

const currentSpeed = computed(() => {
	if (files.value.some(file => file.error)) {
		return null;
	}
	for (const file of files.value) {
		if (file.progress < 1 && file.speed) {
			return file.speed;
		}
	}
	return null;
});

const title = computed(() => {
	if (transfersFinished.value) {
		const erroredFile = files.value.find(file => file.error);
		if (erroredFile) {
			if (erroredFile.error instanceof OperationCancelledError) {
				return isUploading.value ? i18n.global.t("dialog.fileTransfer.uploadCancelledTitle") : i18n.global.t("dialog.fileTransfer.downloadCancelledTitle");
			}
			return isUploading.value ? i18n.global.t("dialog.fileTransfer.uploadFailedTitle") : i18n.global.t("dialog.fileTransfer.downloadFailedTitle");
		}
		return isUploading.value ? i18n.global.t("dialog.fileTransfer.uploadDoneTitle") : i18n.global.t("dialog.fileTransfer.downloadDoneTitle");
	}

	let fileBeingTransferred = 1, totalProgress = 0;
	for (let i = 0; i < files.value.length; i++) {
		const file = files.value[i];
		if ((file.startTime !== null && !file.progress) || file.progress < 1) {
			totalProgress = (i + file.progress) / files.value.length;
			fileBeingTransferred = i + 1;
			break;
		}
	}

	const key = isUploading.value ? "dialog.fileTransfer.uploadingTitle" : "dialog.fileTransfer.downloadingTitle";
	return i18n.global.t(key, [fileBeingTransferred, files.value.length, (totalProgress * 100).toFixed(1)]);
});

function bindRow(el: unknown, index: number) {
	rowRefs.value[index] = (el as HTMLElement | null) ?? null;
}

function trimmedName(file: FileTransferItem): string {
	return file.filename.substring(fileNameOffset.value);
}

function formattedSize(file: FileTransferItem): string {
	const size = file.size ?? (file.content && typeof file.content.size === "number" ? file.content.size : 0);
	return size ? displaySize(size) : "";
}

function getFileIcon(file: FileTransferItem): string {
	if (file.error) {
		return "mdi-alert-circle";
	}
	if (file.progress === 1) {
		return "mdi-check";
	}
	if (file.startTime !== null) {
		return isUploading.value ? "mdi-cloud-upload" : "mdi-cloud-download";
	}
	return "mdi-asterisk";
}

function getProgressColor(file: FileTransferItem): string {
	if (file.error) {
		return "error";
	}
	if (file.progress === 1) {
		return "success";
	}
	return file.retry > 0 ? "warning" : "info";
}

// Trim every common path-prefix character up to the last `/` so the table only shows the parts
// that differ between concurrent transfers
function computeFileNameOffset(items: Array<FileTransferItem>): number {
	if (items.length <= 1) {
		return 0;
	}
	let offset = 0;
	let lastSlash = 0;
	while (offset < items[0].filename.length) {
		const nextChar = items[0].filename[offset];
		for (let i = 1; i < items.length; i++) {
			if (items[i].filename.length <= offset || items[i].filename[offset] !== nextChar) {
				return lastSlash;
			}
		}
		if (nextChar === "/") {
			lastSlash = offset + 1;
		}
		offset++;
	}
	return lastSlash;
}

function cancel() {
	cancellationToken.value?.cancel();
	cancellationToken.value = null;
}

function close() {
	files.value = [];
	cancellationToken.value = null;
	closeProgressOnSuccess.value = false;
	fileNameOffset.value = 0;
	rowRefs.value = [];
}

function onMultipleUploading({ files: list, showProgress, closeProgressOnSuccess: autoClose, cancellationToken: token }: MultipleFilesPayload) {
	if (!showProgress) {
		return;
	}
	isUploading.value = true;
	closeProgressOnSuccess.value = autoClose;
	cancellationToken.value = token;
	files.value = list;
	fileNameOffset.value = computeFileNameOffset(list);
}

function onMultipleDownloading({ files: list, showProgress, closeProgressOnSuccess: autoClose, cancellationToken: token }: MultipleFilesPayload) {
	if (!showProgress) {
		return;
	}
	isUploading.value = false;
	closeProgressOnSuccess.value = autoClose;
	cancellationToken.value = token;
	files.value = list;
	fileNameOffset.value = computeFileNameOffset(list);
}

function onFileComplete({ num, count }: FileCompletePayload) {
	if (num + 1 === count && closeProgressOnSuccess.value && !files.value.some(file => file.error)) {
		close();
		return;
	}
	// Scroll the next row into view so a long transfer list keeps the active row visible
	nextTick(() => {
		const target = rowRefs.value[Math.min(num + 1, rowRefs.value.length - 1)];
		target?.scrollIntoView({ behavior: "smooth", block: "center" });
	});
}

onMounted(() => {
	Events.on("multipleFilesUploading", onMultipleUploading);
	Events.on("multipleFilesDownloading", onMultipleDownloading);
	Events.on("fileUploaded", onFileComplete);
	Events.on("fileDownloaded", onFileComplete);
});

onBeforeUnmount(() => {
	Events.off("multipleFilesUploading", onMultipleUploading);
	Events.off("multipleFilesDownloading", onMultipleDownloading);
	Events.off("fileUploaded", onFileComplete);
	Events.off("fileDownloaded", onFileComplete);
});
</script>
