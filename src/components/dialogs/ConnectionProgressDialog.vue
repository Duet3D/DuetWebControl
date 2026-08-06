<template>
	<v-dialog :model-value="shown" :persistent="isPersistent" width="480">
		<v-card color="primary" theme="dark">
			<v-card-title>
				{{ message }}
			</v-card-title>

			<v-card-text>
				<v-progress-linear :indeterminate="progressIndeterminate" :model-value="progressValue"
								   color="white" class="mb-0" />

				<div v-if="displayReset && machineStore.isConnected" class="d-flex">
					<CodeButton class="mx-auto mt-5" code="M999" :log="false" color="warning"
								:title="$t('dialog.connectionProgress.resetButton.title')">
						<v-icon class="mr-1">mdi-refresh</v-icon>
						{{ $t("dialog.connectionProgress.resetButton.caption") }}
					</CodeButton>
				</div>

				<div v-else-if="isUpdating" class="d-flex flex-column mt-3">
					<span class="mb-1">
						{{ $t("dialog.connectionProgress.boardUpdateMessage", machineStore.boardsBeingUpdated.length) }}
					</span>
					<span v-for="canAddress in machineStore.boardsBeingUpdated.filter(item => item > 0)"
						  :key="canAddress" class="ms-3">
						<v-icon size="small" class="mr-1" :icon="getBoardIcon(canAddress)" />
						{{ getBoardName(canAddress) }}
					</span>
					<span v-if="machineStore.boardsBeingUpdated.includes(0)" class="ms-3">
						<v-icon size="small" class="mr-1" :icon="getBoardIcon(0)" />
						{{ getBoardName(0) }}
					</span>
				</div>

				<div v-else-if="upgrade !== null && upgrade.message" class="mt-3">
					{{ upgrade.message }}
				</div>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { MachineStatus } from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";
import i18n from "@/i18n";

const machineStore = useMachineStore();

// General UI

const shouldBeShown = computed(() => {
	return (machineStore.isConnecting || machineStore.connectingProgress >= 0 || machineStore.isReconnecting || machineStore.isDisconnecting ||
		machineStore.model.state.status === MachineStatus.halted || machineStore.model.state.status === MachineStatus.updating);
});

// Vuetify's dialog transition drives its open/close animations from requestAnimationFrame, which
// browsers pause in hidden tabs. A tab-throttled poll times out in the background, so the dialog
// opens and closes again while nobody is looking - both animations stall half-way and only thaw
// out when the tab is reactivated, leaving a scrimless card on screen. Latch the state instead so
// the dialog only ever animates while the tab can show it
const documentVisible = ref(document.visibilityState === "visible");
const shown = ref(false);

watchEffect(() => {
	if (documentVisible.value) {
		shown.value = shouldBeShown.value;
	}
});

function onVisibilityChange() {
	documentVisible.value = document.visibilityState === "visible";
}

onMounted(() => document.addEventListener("visibilitychange", onVisibilityChange));
onBeforeUnmount(() => document.removeEventListener("visibilitychange", onVisibilityChange));

const isPersistent = computed(() => {
	if (!(displayReset.value && machineStore.isConnected)) {
		// If the connection is gone, allow this dialog only to be dismissed if running as PWA
		return !window.matchMedia("(display-mode: standalone)").matches;
	}
	return false;
});

const currentMessage = computed(() => {
	if (machineStore.isConnecting || machineStore.connectingProgress >= 0) {
		return i18n.global.t("dialog.connectionProgress.connecting");
	}
	if (machineStore.model.state.status === MachineStatus.updating) {
		return i18n.global.t("dialog.connectionProgress.updating");
	}
	if (machineStore.isReconnecting) {
		return i18n.global.t("dialog.connectionProgress.reconnecting");
	}
	if (machineStore.isDisconnecting) {
		return i18n.global.t("dialog.connectionProgress.disconnecting");
	}
	return i18n.global.t("dialog.connectionProgress.standBy");
});

// Every connection flag clears in the same tick that hides the dialog, so a live caption drops to
// the halted fallback for the duration of the closing animation. Keep the last one that applied
const message = ref("");

watchEffect(() => {
	if (shown.value) {
		message.value = currentMessage.value;
	}
});

const isUpdating = computed(() => machineStore.model.state.status === MachineStatus.updating && machineStore.boardsBeingUpdated.length > 0);

// Progress of a software upgrade on the SBC (see M997 S2), only reported in SBC mode

const upgrade = computed(() => (machineStore.model.state.status === MachineStatus.updating) ? (machineStore.model.sbc?.upgrade ?? null) : null);

const progressIndeterminate = computed(() => (upgrade.value !== null) ? (upgrade.value.progress === null) : (machineStore.connectingProgress < 0));

const progressValue = computed(() => (upgrade.value?.progress != null) ? upgrade.value.progress * 100 : Math.max(0, machineStore.connectingProgress));

// Display of boards being updated

function getBoardIcon(canAddress: number) {
	if (machineStore.boardBeingUpdated == canAddress) {
		return "mdi-arrow-right-bold";
	}
	return updatedBoards.includes(canAddress) ? "mdi-check" : "mdi-asterisk";
}

function getBoardName(canAddress: number) {
	const board = machineStore.model.boards.find(board => (board.canAddress ?? 0) === canAddress);
	const name = board ? board.name : boardNames.get(canAddress);
	if (name !== undefined) {
		return canAddress ? `${name || i18n.global.t("dialog.connectionProgress.expansionBoard")} (#${canAddress})` : name;
	}
	return canAddress ? i18n.global.t("dialog.connectionProgress.board", [canAddress]) : i18n.global.t("dialog.connectionProgress.mainboard");
}


// Tracking of updated boards

const updatedBoards = reactive<Array<number>>([]);

// model.boards is emptied while the main board reboots during M997, so a live lookup mid-update
// loses the real names. Snapshot them when the update starts and fall back to the snapshot
const boardNames = reactive(new Map<number, string>());

watch(() => machineStore.boardsBeingUpdated, (boards) => {
	updatedBoards.splice(0);

	boardNames.clear();
	for (const canAddress of boards) {
		const board = machineStore.model.boards.find(board => (board.canAddress ?? 0) === canAddress);
		if (board) {
			boardNames.set(canAddress, board.name);
		}
	}
});

watch(() => machineStore.boardBeingUpdated, (to, from) => {
	if (from >= 0) {
		updatedBoards.push(from);
	}
});

// Show reset button after a delay when the machine is halted

const displayReset = ref(false);
let haltedTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => machineStore.model.state.status, (to: MachineStatus) => {
	if (to === MachineStatus.halted) {
		haltedTimer = setTimeout(() => {
			haltedTimer = null;
			displayReset.value = true;
		}, 4000);
	} else {
		if (haltedTimer !== null) {
			clearTimeout(haltedTimer);
			haltedTimer = null;
		}
		displayReset.value = false;
	}
});

onBeforeUnmount(() => {
	// The dialog can unmount while the halted-state delay is pending; clearing it stops the
	// deferred write to displayReset from firing against a torn-down ref
	if (haltedTimer !== null) {
		clearTimeout(haltedTimer);
		haltedTimer = null;
	}
});
</script>
