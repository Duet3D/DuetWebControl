<template>
	<!-- Queued one-shot notifications (info / success / warning / error). v-snackbar-queue gives us the
		 timer + stacking + dismissal behaviour for free; bound via the computed below so dismissals propagate
		 to the Pinia store -->
	<v-snackbar-queue v-model="generalQueue" :timer="true" timer-color="white" closable
					  location="bottom" :total-visible="totalVisible" display-strategy="hold">
		<template #actions="{ item, props: itemProps }">
			<v-btn v-if="(item as QueueMessage).route" variant="text"
				   :to="(item as QueueMessage).route ?? undefined" @click="itemProps.onClick">
				{{ $t("notification.view") }}
			</v-btn>
		</template>
	</v-snackbar-queue>

	<!-- File-transfer snackbar - foreground single, with live progress and cancel. Shows the first item
		 in the queue; the next transfer takes its place when the current one completes or is cancelled -->
	<v-snackbar v-if="activeTransfer" :model-value="true" :timeout="-1" color="info" location="top">
		<v-progress-linear :indeterminate="activeTransfer.progress === 0" striped absolute location="top"
						   :model-value="activeTransfer.progress" />
		<div class="d-flex align-center w-100 pt-1">
			<v-icon class="me-3">{{ fileTransferIcon(activeTransfer.type) }}</v-icon>
			<div class="d-flex flex-column flex-grow-1 text-truncate">
				<strong class="text-truncate">
					{{ $t(`notification.fileTransfer.${activeTransfer.type}.title`, [
						activeTransfer.filename,
						displayTransferSpeed(activeTransfer.speed),
						Math.round(activeTransfer.progress || 0)
					]) }}
				</strong>
				<span class="text-truncate">
					{{ $t(`notification.fileTransfer.${activeTransfer.type}.message`) }}
				</span>
			</div>
		</div>
		<template #actions>
			<v-btn variant="text" :text="$t('generic.cancel')" @click="activeTransfer.cancel()" />
		</template>
	</v-snackbar>

	<!-- M117 persistent message - separate channel, never auto-dismissed. User can close it explicitly;
		 the next M117 update will replace its contents -->
	<v-snackbar v-if="uiStore.notifications.persistentMessage" :model-value="true" :timeout="-1"
				color="info" location="bottom" multi-line>
		<div class="d-flex flex-column">
			<strong>{{ $t("notification.message") }}</strong>
			<span v-html="formatMessage(uiStore.notifications.persistentMessage)" />
		</div>
		<template #actions>
			<v-btn variant="text" :text="$t('generic.close')"
				   @click="uiStore.showPersistentMessage(null)" />
		</template>
	</v-snackbar>
</template>

<script setup lang="ts">
import { FileTransferType, type GeneralNotification, useUiStore } from "@/stores/ui";
import { displayTransferSpeed } from "@/utils/display";

const uiStore = useUiStore();

// Pre-snackbar shape we feed v-snackbar-queue. Extra fields (id, route) are ignored by Vuetify but kept
// so the actions slot can wire up navigation and our setter can dedupe dismissals back to the store
interface QueueMessage {
	id: string;
	title: string;
	text: string;
	color: string;
	prependIcon?: string;
	timeout: number;
	route: string | null;
	closable: boolean;
}

const totalVisible = 3;

const generalQueue = computed<Array<QueueMessage>>({
	get: () => uiStore.notifications.general.map(toQueueMessage),
	set: (remaining) => {
		// Vuetify mutates the bound array on dismissal - mirror the surviving ids back to the store
		const survivingIds = new Set(remaining.map(m => m.id));
		uiStore.notifications.general = uiStore.notifications.general.filter(n => survivingIds.has(n.id));
	}
});

function toQueueMessage(notification: GeneralNotification): QueueMessage {
	return {
		id: notification.id,
		title: notification.title ?? "",
		text: notification.message ?? "",
		color: notification.type,
		prependIcon: notification.icon || undefined,
		timeout: notification.timeout > 0 ? notification.timeout : -1,
		route: notification.route,
		closable: true
	};
}

const activeTransfer = computed(() => uiStore.notifications.fileTransfers[0] ?? null);

function fileTransferIcon(type: FileTransferType): string {
	switch (type) {
		case FileTransferType.upload: return "mdi-cloud-upload";
		case FileTransferType.download: return "mdi-cloud-download";
		case FileTransferType.systemPackageInstall: return "mdi-cog-sync";
	}
}

// Producers can embed <br> in titles/messages already (logCode joins reply lines with <br>);
// just normalise plain newlines so multi-line strings render correctly
function formatMessage(message: string): string {
	return message.replace(/\n/g, "<br>");
}
</script>
