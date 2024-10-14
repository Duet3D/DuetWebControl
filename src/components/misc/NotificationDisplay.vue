<style>
@keyframes animate-progress {
	from {
		width: 0%;
	}

	to {
		width: 100%;
	}
}

@keyframes animate-progress-bg {
	from {
		left: 0%;
		width: 100%;
	}

	to {
		left: 100%;
		width: 0%;
	}
}

.animate-progress .v-progress-linear__determinate {
	animation-name: "animate-progress";
	animation-duration: 5s;
	animation-timing-function: linear;
}

.animate-progress .v-progress-linear__background {
	animation-name: "animate-progress-bg";
	animation-duration: 5s;
	animation-timing-function: linear;
}
</style>

<template>
	<v-snackbar v-if="fileTransferNotification !== null" :model-value="true" :timeout="-1" color="info">
		<v-progress-linear :indeterminate="fileTransferNotification.progress === 0" striped
						   :model-value="fileTransferNotification.progress ?? 0" absolute top />

		<div class="d-inline-flex align-center w-100">
			<v-icon class="mr-4">
				{{ fileTransferIcon }}
			</v-icon>

			<div class="d-flex flex-column flex-grow-1">
				<strong>
					{{ $t(`notification.fileTransfer.${fileTransferNotification.type}.title`, [fileTransferNotification.filename, displayTransferSpeed(fileTransferNotification.speed), Math.round(fileTransferNotification.progress || 0)]) }}
				</strong>
				<p class="mb-0">
					{{ $t(`notification.fileTransfer.${fileTransferNotification.type}.message`) }}
				</p>
			</div>

			<v-btn variant="text" :text="$t('generic.cancel')" class="ml-2" @click.stop="cancel" />
		</div>
	</v-snackbar>
	<v-snackbar v-else-if="notification !== null" :model-value="true" :timeout="-1"
				:color="(notification !== null) ? notification.type : 'info'" :class="{ pointer: !!notification.route }"
				@click.native="clicked">
		<v-progress-linear v-if="animateProgress" ref="progressBar" :indeterminate="notification.progress === 0"
						   :model-value="100" absolute top :class="{ 'animate-progress': animateProgress }" />
		<v-progress-linear v-else-if="notification.progress !== null" :indeterminate="notification.progress === 0"
						   :model-value="notification.progress" absolute top />

		<div class="d-inline-flex align-center w-100"
			 :class="{ 'mt-1': (notification.timeout !== null) && (notification.timeout > 0) }">
			<v-icon v-if="notification.icon !== null" class="mr-4">
				{{ notification.icon }}
			</v-icon>

			<div class="d-flex flex-column flex-grow-1">
				<strong v-if="notification.title !== null" v-html="notificationTitle"></strong>
				<p v-if="notification.message !== null" class="mb-0" v-html="notificationMessage"></p>
			</div>

			<v-btn variant="text" :text="notification.cancel ? $t('generic.cancel') : $t('generic.close')" class="ml-2"
				   @click.stop="close" />
		</div>
	</v-snackbar>
</template>

<script setup lang="ts">
import { VProgressLinear } from "vuetify/components";

import { FileTransferType, Notification, useUiStore } from "@/stores/ui";
import { displayTransferSpeed } from "@/utils/display";

const uiStore = useUiStore();

// File Transfer notifications

const fileTransferNotification = computed(() => (uiStore.notifications.fileTransfers.length > 0) ? uiStore.notifications.fileTransfers[0] : null);
const fileTransferIcon = computed(() => {
	if (fileTransferNotification.value !== null) {
		const transferType = fileTransferNotification.value.type as FileTransferType;
		switch (transferType) {
			case FileTransferType.upload: return "mdi-cloud-upload";
			case FileTransferType.download: return "mdi-cloud-download";
			case FileTransferType.systemPackageInstall: return "mdi-cog-sync";
		}
	}
	return "";
});

function cancel() {
	if (fileTransferNotification.value?.cancel) {
		fileTransferNotification.value.cancel();
	}
}

watch(() => fileTransferNotification.value, (to) => {
	if (notification.value !== null) {
		if (to !== null) {
			notificationChanged(null, notification.value);
		} else {
			notificationChanged(notification.value, null);
		}
	}
});

// General notifications

const animateProgress = computed(() => (notification.value !== null) && (notification.value.timeout !== null) && (notification.value.timeout > 0));

const notification = computed(() => (uiStore.notifications.general.length > 0) ? uiStore.notifications.general[0] : null);
const notificationTitle = computed(() => {
	if (notification.value !== null && notification.value.title !== null) {
		return notification.value.title.replace(/\n/g, "<br>");
	}
	return "";
});

const notificationMessage = computed(() => {
	if (notification.value !== null && notification.value.message !== null) {
		return notification.value.message.replace(/\n/g, "<br>");
	}
	return "";
});

let autoCloseTimer: NodeJS.Timeout | null = null, whenShown: Date | null = null;

function clicked() {
	if (notification.value !== null && notification.value.route) {
		const router = useRouter();
		router.push(notification.value.route);

		notification.value.close();
	}
}

function close() {
	if (notification.value?.cancel) {
		notification.value.cancel();
	} else if (notification.value?.close) {
		notification.value.close();
	}
}

watch(() => notification.value, (to, from) => {
	notificationChanged(to, from);
});

// Display management

const progressBar = ref<VProgressLinear | null>(null);
function notificationChanged(to: Notification | null, from: Notification | null) {
	if (to === from) {
		// For some reason Vue sometimes triggers this even when nothing has changed
		return;
	}

	if (from !== null) {
		if (whenShown !== null) {
			from.timeDisplayed = (new Date()).getTime() - whenShown.getTime();
		}

		if (autoCloseTimer !== null) {
			clearInterval(autoCloseTimer);
			autoCloseTimer = null;
		}
	}

	if (to !== null) {
		whenShown = new Date();
		if (to.timeout !== null && to.timeout > 0) {
			// Reset animations if needed
			for (const animation of document.getAnimations()) {
				if (animation instanceof CSSAnimation && ["animate-progress", "animate-progress-bg"].includes(animation.animationName)) {
					animation.cancel();
					animation.play();
				}
			}

			// Set CSS animation properties when the notification has been rendered
			nextTick(() => {
				if (progressBar.value !== null) {
					// Apply custom CSS animation duration to progress bar
					const progressDiv = progressBar.value.$el.querySelector(".v-progress-linear__determinate") as HTMLDivElement | undefined;
					if (progressDiv) {
						progressDiv.style["animationDelay"] = `${-to.timeDisplayed}ms`;
						progressDiv.style["animationDuration"] = `${to.timeout}ms`;
					}

					// Apply custom CSS animation duration to progress bar background
					const progressBgDiv = progressBar.value.$el.querySelector(".v-progress-linear__background") as HTMLDivElement | undefined;
					if (progressBgDiv) {
						progressBgDiv.style["animationDelay"] = `${-to.timeDisplayed}ms`;
						progressBgDiv.style["animationDuration"] = `${to.timeout}ms`;
					}
				}
			});

			// Close the notification automatically when the timeout expires 
			autoCloseTimer = setInterval(close, Math.max(to.timeout - to.timeDisplayed, 0));
		}
	}
}
</script>