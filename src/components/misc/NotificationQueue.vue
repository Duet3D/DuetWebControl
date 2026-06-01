<template>
	<!-- Single queue for every notification source: file transfers, general toasts, persistent
		 toasts and the M117 persistent message all flow through here, ordered by priority so an
		 error pre-empts the previously visible items and a transfer / active M117 sits above
		 ordinary info/success toasts.
		 Vuetify's built-in :timer is disabled: it drives the bar via setInterval polling at 5 Hz,
		 which renders as a stepped/sluggish drain. We render our own bar in the #text slot below,
		 powered by a single CSS keyframe animation - smooth at any frame rate and free -->
	<v-snackbar-queue v-model="unifiedQueue" :timer="false" closable
					  location="bottom center" :total-visible="totalVisible">
		<template #text="{ item }">
			<FileTransferProgress v-if="(item as QueueMessage).transfer" :transfer-id="(item as QueueMessage).id" />
			<template v-else>
				<div v-if="(item as QueueMessage).timeout > 0" class="dwc-snackbar-timer"
					 :style="{ animationDuration: `${(item as QueueMessage).timeout}ms` }" />
				<div :class="{ 'd-flex flex-column w-100': true, 'notification-clickable': hasRoute(item as QueueMessage) }"
					 @click="onNotificationClick(item as QueueMessage)">
					<strong v-if="(item as QueueMessage).headline">{{ (item as QueueMessage).headline }}</strong>
					<span v-if="(item as QueueMessage).text" class="dwc-snackbar-text">{{ (item as QueueMessage).text }}</span>
				</div>
			</template>
		</template>
		<template #actions="{ item, props: itemProps }">
			<v-btn v-if="(item as QueueMessage).transfer" variant="text" :text="$t('generic.cancel')"
				   @click="cancelTransfer((item as QueueMessage).id)" />
			<v-btn v-else icon="mdi-close" variant="text" @click="itemProps.onClick" />
		</template>
	</v-snackbar-queue>
</template>

<script setup lang="ts">
import FileTransferProgress from "./FileTransferProgress.vue";
import { type GeneralNotification, useUiStore } from "@/stores/ui";
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
	// Marks a live file-transfer item: rendered via FileTransferProgress and dismissed by its own
	// promise resolving (see the file-transfer watcher) rather than a timer or the close button
	transfer?: boolean;
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
	if (item.transfer || item.id === PERSISTENT_MESSAGE_ID) {
		return 80;
	}
	return SEVERITY_PRIORITY[item.color] ?? 0;
}

// File transfers are long-lived, live-progress items - the opposite of the one-shot messages
// VSnackbarQueue is built around. Each active transfer is mirrored into the queue as its own item
// (its progress bar lives in FileTransferProgress, which reads the live store object). The queue
// snapshots and "drains" an item from the model the moment it shows it, so the transfer must not
// be re-derived from the store on every recompute or it would re-enqueue as a duplicate; instead
// we add it once here on arrival and resolve a per-item promise on completion so the queue
// dismisses the snackbar (a timer/close button would make no sense for a transfer)
const transferItems = ref<Array<QueueMessage>>([]);
const transferResolvers = new Map<string, () => void>();

watch(() => uiStore.notifications.fileTransfers.map(t => t.id).join("\n"), () => {
	const transfers = uiStore.notifications.fileTransfers;
	for (const transfer of transfers) {
		if (!transferResolvers.has(transfer.id)) {
			let resolve!: () => void;
			const promise = new Promise<void>((r) => { resolve = r; });
			transferResolvers.set(transfer.id, resolve);
			// loading:false overrides the spinner VSnackbarQueue would otherwise show for any
			// promise-bound item; timeout -1 keeps the snackbar up until `resolve` fires
			transferItems.value.push({
				id: transfer.id, headline: "", text: "", color: "info",
				timeout: -1, route: null, closable: false, loading: false, transfer: true, promise
			});
		}
	}
	// Finished transfers: resolve the promise (VSnackbarQueue then auto-dismisses the snackbar) and
	// forget them. The transferItems copy may already be gone if the snackbar was shown (drained in
	// the setter below); the filter is then a no-op
	const presentIds = new Set(transfers.map(t => t.id));
	for (const id of [...transferResolvers.keys()]) {
		if (!presentIds.has(id)) {
			transferResolvers.get(id)!();
			transferResolvers.delete(id);
			transferItems.value = transferItems.value.filter(item => item.id !== id);
		}
	}
}, { immediate: true });

const unifiedQueue = computed<Array<QueueMessage>>({
	get: () => {
		const items: Array<QueueMessage> = [
			...uiStore.notifications.general.map(toQueueMessage),
			...uiStore.notifications.persistent.map(toQueueMessage),
			...transferItems.value,
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
		// A transfer leaves the model only because the queue took it into its own visible set on
		// show; drop our copy so a getter recompute can't re-enqueue it. Its resolver lives on in
		// transferResolvers until the transfer actually finishes
		transferItems.value = transferItems.value.filter(item => survivingIds.has(item.id));
	}
});

function cancelTransfer(id: string) {
	uiStore.notifications.fileTransfers.find(t => t.id === id)?.cancel();
}

function hasRoute(item: QueueMessage): boolean {
	return !!item.route;
}

// Clicking the body of a routed notification navigates to its target and dismisses the item so
// the user lands on the page without the snackbar still hovering. Routed notifications are
// typically code replies pointing at /Console
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

// v-snackbar-queue forces every visible VSnackbar's timeout to -1 while the tab is hidden (its
// pauseAll mechanism, keyed off document.visibilityState), and the queue's recovery on visibility
// return is unreliable - a notification queued during a long background period can stay stuck on
// screen. Drop every auto-timeout notification on return; whatever was on screen had its timer
// disabled and the user wasn't watching anyway. Persistent toasts (timeout <= 0) are left alone
function onVisibilityChange() {
	if (document.visibilityState !== "visible") {
		return;
	}
	for (const [id, notification] of uiStore.activeNotifications) {
		if (notification.timeout > 0) {
			uiStore.dismissNotification(id);
		}
	}
}

onMounted(() => document.addEventListener("visibilitychange", onVisibilityChange));
onBeforeUnmount(() => document.removeEventListener("visibilitychange", onVisibilityChange));
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
.dwc-snackbar-text {
	white-space: pre-wrap;
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
