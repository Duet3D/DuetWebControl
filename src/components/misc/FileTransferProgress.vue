<template>
	<template v-if="transfer">
		<v-progress-linear :indeterminate="transfer.progress === 0" striped absolute location="top"
						   :model-value="transfer.progress" />
		<div class="d-flex align-center w-100 pt-1">
			<v-icon class="me-3">{{ icon }}</v-icon>
			<div class="d-flex flex-column flex-grow-1 text-truncate">
				<strong class="text-truncate">
					{{ $t(`notification.fileTransfer.${transfer.type}.title`, [
						transfer.filename,
						displayTransferSpeed(transfer.speed),
						Math.round(transfer.progress || 0)
					]) }}
				</strong>
				<span class="text-truncate">
					{{ $t(`notification.fileTransfer.${transfer.type}.message`) }}
				</span>
			</div>
		</div>
	</template>
</template>

<script setup lang="ts">
import { FileTransferType, useUiStore } from "@/stores/ui";
import { displayTransferSpeed } from "@/utils/display";

const props = defineProps<{ transferId: string }>();

const uiStore = useUiStore();

// Resolve the live transfer from the store on every render so the progress bar keeps moving.
// VSnackbarQueue snapshots queue items on show, so a value bound through the queue item would
// freeze at the figure it held when the snackbar first appeared
const transfer = computed(() => uiStore.notifications.fileTransfers.find(t => t.id === props.transferId) ?? null);

const icon = computed(() => {
	switch (transfer.value?.type) {
		case FileTransferType.upload: return "mdi-cloud-upload";
		case FileTransferType.download: return "mdi-cloud-download";
		case FileTransferType.systemPackageInstall: return "mdi-cog-sync";
		case FileTransferType.index: return "mdi-folder-search";
		case FileTransferType.compress: return "mdi-folder-zip";
		default: return "";
	}
});
</script>
