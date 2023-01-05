<style>
.v-snack {
	z-index: 1 !important;
}

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

<style scoped>
.progress-bar {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	border-radius: 4px;
}

.pointer {
	cursor: pointer;
}
</style>

<template>
	<v-fade-transition>
		<v-snackbar v-if="fileTransferNotification !== null" :value="true"
					:style="{ 'padding-bottom': `${$vuetify.application.bottom + 8}px` }" :timeout="-1" color="info">
			<v-progress-linear :color="progressColor" :indeterminate="fileTransferNotification.progress === 0" striped
							   :value="fileTransferNotification.progress" class="progress-bar" />

			<div class="d-flex mt-1">
				<v-icon class="mr-4">
					{{ fileTransferIcon }}
				</v-icon>

				<div class="d-block">
					<strong>
						{{ $t(`notification.${fileTransferNotification.type}.title`, [fileTransferNotification.filename, $displayTransferSpeed(fileTransferNotification.speed), Math.round(fileTransferNotification.progress || 0)]) }}
					</strong>
					<p class="mb-0">
						{{ $t(`notification.${fileTransferNotification.type}.message`) }}
					</p>
				</div>
			</div>

			<template #action="{ attrs }">
				<v-btn v-bind="attrs" color="white" text @click.stop="cancel">
					{{ $t("generic.cancel") }}
				</v-btn>
			</template>
		</v-snackbar>
		<v-snackbar v-else-if="notification !== null" :value="true" :timeout="-1" :color="(notification !== null) ? notification.type : 'info'"
					:style="{ 'padding-bottom': `${$vuetify.application.bottom + 8}px` }"
					:class="{ pointer: !!notification.route }" @click.native="clicked">
			<v-progress-linear v-if="animateProgress" ref="progressBar" :color="progressColor"
							   :indeterminate="notification.progress === 0" :value="100" class="progress-bar"
							   :class="{ 'animate-progress': animateProgress }" />
			<v-progress-linear v-else-if="notification.progress !== null" :color="progressColor"
							   :indeterminate="notification.progress === 0" :value="notification.progress" class="progress-bar" />

			<div class="d-flex" :class="{ 'mt-1' : (notification.timeout !== null) && (notification.timeout > 0)}">
				<v-icon v-if="notification.icon !== null" class="mr-4" v-text="notification.icon" />

				<div class="d-block">
					<strong v-if="notification.title !== null" v-html="notificationTitle"></strong>
					<p v-if="notification.message !== null" class="mb-0" v-html="notificationMessage"></p>
				</div>
			</div>

			<template #action="{ attrs }">
				<v-btn v-bind="attrs" color="white" text @click.stop="close">
					{{ notification.cancel ? $t("generic.cancel") : $t("generic.close") }}
				</v-btn>
			</template>
		</v-snackbar>
	</v-fade-transition>
</template>

<script lang="ts">
import Vue from "vue";

import { notifications, fileTransferNotifications, FileTransferType, Notification } from "@/utils/notifications";

export default Vue.extend({
	computed: {
		animateProgress(): boolean {
			return (this.notification !== null) && (this.notification.timeout !== null) && (this.notification.timeout > 0)
		},
		progressColor(): string {
			return this.$vuetify.theme.dark ? "grey darken-3" : "grey lighten-4";
		},
		fileTransferNotification(): Notification | null {
			return (this.fileTransferNotifications.length > 0) ? this.fileTransferNotifications[0] : null;
		},
		fileTransferIcon(): string {
			if (this.fileTransferNotification !== null) {
				const fileTransferType = this.fileTransferNotification.type as FileTransferType;
				switch (fileTransferType) {
					case FileTransferType.upload: return "mdi-cloud-upload";
					case FileTransferType.download: return "mdi-cloud-download";
					case FileTransferType.install: return "mdi-cog-sync";
					default:
						const _exhaustiveCheck: never = fileTransferType;
						break;
				}
			}
			return "";
		},
		notification(): Notification | null {
			return (this.notifications.length > 0) ? this.notifications[0] : null;
		},
		notificationTitle(): string {
			if (this.notification !== null && this.notification.title !== null) {
				return this.notification.title.replace(/\n/g, "<br>");
			}
			return "";
		},
		notificationMessage(): string {
			if (this.notification !== null && this.notification.message !== null) {
				return this.notification.message.replace(/\n/g, "<br>");
			}
			return "";
		}
	},
	data() {
		return {
			autoCloseTimer: null as NodeJS.Timeout | null,
			fileTransferNotifications,
			notifications,
			whenShown: null as Date | null
		}
	},
	methods: {
		clicked() {
			if (this.notification && this.notification.route) {
				this.$router.push(this.notification.route);
				this.notification.close();
			}
		},
		cancel() {
			if (this.fileTransferNotification?.cancel) {
				this.fileTransferNotification.cancel();
			}
		},
		close() {
			if (this.notification?.cancel) {
				this.notification.cancel();
			} else if (this.notification?.close) {
				this.notification.close();
			}
		}
	},
	watch: {
		notification(to: Notification, from: Notification) {
			if (to === from) {
				// For some reason Vue sometimes triggers this even when nothing has changed
				return;
			}

			if (from) {
				if (this.whenShown !== null) {
					from.timeDisplayed = (new Date()).getTime() - this.whenShown.getTime();
				}

				if (this.autoCloseTimer !== null) {
					clearInterval(this.autoCloseTimer);
					this.autoCloseTimer = null;
				}
			}

			if (to) {
				this.whenShown = new Date();
				if (to.timeout !== null && to.timeout > 0) {
					// Reset animations if needed
					for (const animation of document.getAnimations()) {
						if (animation instanceof CSSAnimation && ["animate-progress", "animate-progress-bg"].includes(animation.animationName)) {
							animation.cancel();
							animation.play();
						}
					}

					// Set CSS animation properties when the notification has been rendered
					this.$nextTick(() => {
						if (this.$refs.progressBar) {
							// Apply custom CSS animation duration to progress bar
							const progressDiv = this.$refs.progressBar.$el.querySelector(".v-progress-linear__determinate") as HTMLDivElement | undefined;
							if (progressDiv) {
								progressDiv.style["animationDelay"] = `${-to.timeDisplayed}ms`;
								progressDiv.style["animationDuration"] = `${to.timeout}ms`;
							}

							// Apply custom CSS animation duration to progress bar background
							const progressBgDiv = this.$refs.progressBar.$el.querySelector(".v-progress-linear__background") as HTMLDivElement | undefined;
							if (progressBgDiv) {
								progressBgDiv.style["animationDelay"] = `${-to.timeDisplayed}ms`;
								progressBgDiv.style["animationDuration"] = `${to.timeout}ms`;
							}
						}
					});

					// Close the notification automatically when the timeout expires 
					this.autoCloseTimer = setInterval(this.close, Math.max(to.timeout - to.timeDisplayed, 0));
				}
			}
		}
	}
});
</script>