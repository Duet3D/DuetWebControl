<style>
.v-snack {
	z-index: 1 !important;
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
		<v-snackbar v-if="fileTransferNotification !== null" :value="true" :style="{ 'padding-bottom': `${$vuetify.application.bottom + 8}px` }" :timeout="-1" color="info">
			<v-progress-linear :color="progressColor" :indeterminate="fileTransferNotification.progress === 0" striped :value="fileTransferNotification.progress" class="progress-bar"/>

			<div class="d-flex mt-1">
				<v-icon class="mr-4">
					{{ `mdi-cloud-${fileTransferNotification.type}` }}
				</v-icon>

				<div class="d-block">
					<strong>
						{{ $t(`notification.${fileTransferNotification.type}.title`, [fileTransferNotification.filename, $displaySpeed(fileTransferNotification.speed), Math.round(fileTransferNotification.progress)]) }}
					</strong>
					<p class="mb-0">
						{{ $t(`notification.${fileTransferNotification.type}.message`) }}
					</p>
				</div>
			</div>

			<template #action="{ attrs }">
				<v-btn v-bind="attrs" color="white" text @click.stop="cancel">
					{{ $t('generic.cancel') }}
				</v-btn>
			</template>
		</v-snackbar>
		<v-snackbar v-else-if="notification !== null" :value="true" :timeout="-1" :color="notification.type"
					:style="{ 'padding-bottom': `${$vuetify.application.bottom + 8}px` }" :class="{ pointer: !!notification.route }"
					@click.native="clicked">
			<v-progress-linear v-show="notificationProgress !== null" :color="progressColor" :indeterminate="notification.progress === 0" :value="notificationProgress" class="progress-bar"/>

			<div class="d-flex" :class="{ 'mt-1' : notification.timeout > 0}">
				<v-icon v-if="notification.icon !== ''" class="mr-4" v-text="notification.icon"/>

				<div class="d-block">
					<strong v-if="notification.title" v-html="notification.title.replace(/\n/g, '<br>')"></strong>
					<p v-if="notification.message" class="mb-0" v-html="notification.message.replace(/\n/g, '<br>')"></p>
				</div>
			</div>

			<template #action="{ attrs }">
				<v-btn v-bind="attrs" color="white" text @click.stop="close">
					{{ $t('generic.close') }}
				</v-btn>
			</template>
		</v-snackbar>
	</v-fade-transition>
</template>
<script>
'use strict'

import { notifications, fileTransferNotifications } from "@/utils/notifications"

export default {
	computed: {
		progressColor() {
			return this.$vuetify.theme.dark ? 'grey darken-3' : 'grey lighten-4';
		},
		fileTransferNotification() {
			return (this.fileTransferNotifications.length > 0) ? this.fileTransferNotifications[0] : null;
		},
		notification() {
			return (this.notifications.length > 0) ? this.notifications[0] : null;
		},
		notificationProgress() {
			return (this.notification && this.notification.timeout > 0)
				? Math.min(this.notification.timeDisplayed / this.notification.timeout, 1) * 100
					: this.notification.progress;
		}
	},
	data() {
		return {
			notifications,
			fileTransferNotifications,
			progressTimerValue: 0,
			progressTimer: null
		}
	},
	methods: {
		updateProgress() {
			if (this.notification && this.notification.timeout > 0) {
				this.notification.timeDisplayed += 100;
				if (this.notificationProgress === 100) {
					this.notification.close();
				}
			} else {
				clearInterval(this.progressTimer);
				this.progressTimer = null;
				this.progressTimerValue = null;
			}
		},
		clicked() {
			if (this.notification && this.notification.route) {
				this.$router.push(this.notification.route);
				this.notification.close();
			}
		},
		cancel() {
			if (this.fileTransferNotification) {
				this.fileTransferNotification.cancel();
			}
		},
		close() {
			if (this.notification) {
				this.notification.close();
			}
			if (this.progressTimer !== null) {
				clearInterval(this.progressTimer);
				this.progressTimer = null;
			}
		}
	},
	watch: {
		fileTransferNotification(to, from) {
			if (to === from) {
				// For some reason Vue sometimes triggers this even when nothing has changed
				return;
			}

			if (to && this.progressTimer !== null) {
				clearInterval(this.progressTimer);
				this.progressTimer = null;
			}

			if (!to && this.notification && this.notification.timeout > 0) {
				this.progressTimerValue = 0;
				this.progressTimer = setInterval(this.updateProgress, 100);
			}
		},
		notification(to, from) {
			if (to === from) {
				// For some reason Vue sometimes triggers this even when nothing has changed
				return;
			}

			if (from && from.timeout > 0) {
				clearInterval(this.progressTimer);
				this.progressTimer = null;
				this.progressTimerValue = null;
			}

			if (to && to.timeout > 0) {
				this.progressTimerValue = 0;
				this.progressTimer = setInterval(this.updateProgress, 100);
			}
		}
	}
}
</script>
