<template>
	<!-- File-transfer snackbar lives at the top with its own live progress bar; it isn't a
		 "notification" in the queued-message sense, so keep it independent of the bottom queue -->
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

	<!-- Single queue for every other notification source: general toasts, persistent toasts and the
		 M117 persistent message all flow through here, ordered by priority so an error pre-empts
		 the previously visible items and an active M117 sits above ordinary info/success toasts.
		 Vuetify's built-in :timer is disabled: it drives the bar via setInterval polling at 5 Hz,
		 which renders as a stepped/sluggish drain. We render our own bar in the #text slot below,
		 powered by a single CSS keyframe animation - smooth at any frame rate and free -->
	<v-snackbar-queue v-model="unifiedQueue" :timer="false" closable
					  location="bottom center" :total-visible="totalVisible">
		<template #text="{ item }">
			<div v-if="(item as QueueMessage).timeout > 0" class="dwc-snackbar-timer"
				 :style="{ animationDuration: `${(item as QueueMessage).timeout}ms` }" />
			<div :class="{ 'd-flex flex-column w-100': true, 'notification-clickable': hasRoute(item as QueueMessage) }"
				 @click="onNotificationClick(item as QueueMessage)">
				<strong v-if="(item as QueueMessage).headline">{{ (item as QueueMessage).headline }}</strong>
				<span v-if="(item as QueueMessage).id === PERSISTENT_MESSAGE_ID"
					  v-html="formatMultilineMessage((item as QueueMessage).text)" />
				<span v-else-if="(item as QueueMessage).text">{{ (item as QueueMessage).text }}</span>
			</div>
		</template>
		<template #actions="{ props: itemProps }">
			<v-btn icon="mdi-close" variant="text" @click="itemProps.onClick" />
		</template>
	</v-snackbar-queue>
</template>

<script setup lang="ts">
import { FileTransferType, type GeneralNotification, useUiStore } from "@/stores/ui";
import { displayTransferSpeed } from "@/utils/display";
import i18n from "@/i18n";

const uiStore = useUiStore();
const router = useRouter();

// Pre-snackbar shape we feed v-snackbar-queue. Extra fields (id, route, headline) are ignored by
// Vuetify and routed through our #text slot - the field is called `headline` rather than `title`
// because VSnackbar reads `props.title` and would render it as a second header line of its own.
// `promise` is read by VSnackbarQueue directly: when it resolves, the queue replaces the item
// with a 1 ms-timeout one and the snackbar auto-dismisses. `onDismiss` is the queue's per-item
// hook fired on any dismissal path (timer, X click, overflow, promise-driven) - we use it to
// keep uiStore.activeNotifications in sync so the chip counter tracks what's visible
interface QueueMessage {
	id: string;
	headline: string;
	text: string;
	color: string;
	prependIcon?: string;
	timeout: number;
	route: string | null;
	closable: boolean;
	loading?: boolean;
	promise?: Promise<unknown>;
	onDismiss?: () => void;
}

const totalVisible = 3;

// Sentinel id for the singleton M117 entry. The store keeps `persistentMessage` as a bare string;
// we lift it into the queue under this id so the same dismissal pipeline can route the close back
// to `uiStore.showPersistentMessage(null)`
const PERSISTENT_MESSAGE_ID = "__persistent-message__";

function toQueueMessage(notification: GeneralNotification): QueueMessage {
	return {
		id: notification.id,
		headline: notification.title ?? "",
		text: notification.message ?? "",
		color: notification.type,
		prependIcon: notification.icon || undefined,
		timeout: notification.timeout > 0 ? notification.timeout : -1,
		route: notification.route,
		closable: true,
		// Override v-snackbar-queue's automatic `loading: true` whenever a promise is provided.
		// We use promises purely as a dismissal hook (every notification has an internal one for
		// programmatic dismissal); the snackbar shouldn't render a spinner for ordinary replies
		loading: false,
		promise: notification.promise,
		onDismiss: () => uiStore.notificationDismissedByQueue(notification.id)
	};
}

function buildPersistentMessageItem(message: string): QueueMessage {
	return {
		id: PERSISTENT_MESSAGE_ID,
		headline: i18n.global.t("notification.message"),
		text: message,
		color: "info",
		prependIcon: "mdi-message-text-outline",
		timeout: -1,
		route: null,
		closable: true
	};
}

// Priority ladder: error > persistent message > warning > info > success. Unknown colors fall
// to the bottom (0) rather than wedge themselves anywhere mid-stack
const SEVERITY_PRIORITY: Record<string, number> = {
	error: 100,
	warning: 60,
	info: 40,
	success: 20,
};

function priorityOf(item: QueueMessage): number {
	if (item.id === PERSISTENT_MESSAGE_ID) {
		return 80;
	}
	return SEVERITY_PRIORITY[item.color] ?? 0;
}

const unifiedQueue = computed<Array<QueueMessage>>({
	get: () => {
		const items: Array<QueueMessage> = [
			...uiStore.notifications.general.map(toQueueMessage),
			...uiStore.notifications.persistent.map(toQueueMessage),
		];
		if (uiStore.notifications.persistentMessage !== null) {
			items.push(buildPersistentMessageItem(uiStore.notifications.persistentMessage));
		}
		// Stable sort (V8 since ES2019) - same-priority items keep their arrival order
		return items.slice().sort((a, b) => priorityOf(b) - priorityOf(a));
	},
	set: (remaining) => {
		// Vuetify mutates the bound array on dismissal - mirror the surviving ids back to each
		// source, including the singleton persistent message which lives in its own store slot
		const survivingIds = new Set(remaining.map(m => m.id));
		uiStore.notifications.general = uiStore.notifications.general.filter(n => survivingIds.has(n.id));
		uiStore.notifications.persistent = uiStore.notifications.persistent.filter(n => survivingIds.has(n.id));
		if (!survivingIds.has(PERSISTENT_MESSAGE_ID) && uiStore.notifications.persistentMessage !== null) {
			uiStore.showPersistentMessage(null);
		}
	}
});

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
function formatMultilineMessage(message: string): string {
	return message.replace(/\n/g, "<br>");
}

function hasRoute(item: QueueMessage): boolean {
	return !!item.route;
}

// Clicking the body of a routed notification navigates to its target (matches v3.7's behaviour
// where the only notifications with a destination were code replies pointing at Console) and
// dismisses the item so the user lands on the page without the snackbar still hovering
function onNotificationClick(item: QueueMessage) {
	if (!item.route) {
		return;
	}
	router.push(item.route);
	if (item.id === PERSISTENT_MESSAGE_ID) {
		uiStore.showPersistentMessage(null);
	} else {
		uiStore.dismissNotification(item.id);
	}
}
</script>

<!-- Unscoped: v-snackbar teleports its wrapper into a top-level v-overlay outside our component
	 tree, so scoped CSS never lands on it -->
<style>
.v-snackbar--bottom > .v-snackbar__wrapper {
	margin-bottom: 0.5rem;
}
.notification-clickable {
	cursor: pointer;
}
.dwc-snackbar-timer {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 4px;
	background-color: rgba(255, 255, 255, 0.7);
	transform-origin: left center;
	animation-name: dwc-snackbar-timer-drain;
	animation-timing-function: linear;
	animation-fill-mode: forwards;
}
.v-snackbar__wrapper:hover .dwc-snackbar-timer {
	animation-play-state: paused;
}
@keyframes dwc-snackbar-timer-drain {
	from { transform: scaleX(1); }
	to { transform: scaleX(0); }
}
</style>
