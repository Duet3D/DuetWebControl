<template>
	<v-dialog :model-value="shown" :persistent="isPersistent" width="480">
		<v-card color="primary" dark>
			<v-card-title>
				{{ message }}
			</v-card-title>

			<v-card-text>
				<v-progress-linear :indeterminate="machineStore.connectingProgress < 0"
								   :value="machineStore.connectingProgress" color="white" class="mb-0" />

				<div v-if="displayReset && machineStore.isConnected" class="d-flex">
					<CodeButton class="mx-auto mt-5" code="M999" :log="false" color="warning"
								:title="$t('dialog.connectionProgress.resetButton.title')">
						<v-icon class="mr-1">mdi-refresh</v-icon>
						{{ $t("dialog.connectionProgress.resetButton.caption") }}
					</CodeButton>
				</div>

				<div v-else-if="isUpdating"
					 class="d-flex flex-column mt-3">
					<span class="mb-1">
						{{ $tc("dialog.connectionProgress.boardUpdateMessage", machineStore.boardsBeingUpdated.length) }}
					</span>
					<span v-for="canAddress in machineStore.boardsBeingUpdated.filter(item => item > 0)"
						  :key="canAddress" class="ms-3">
						<v-icon small class="mr-1" v-text="getBoardIcon(canAddress)" />
						{{ getBoardName(canAddress) }}
					</span>
					<span v-if="machineStore.boardsBeingUpdated.includes(0)" class="ms-3">
						<v-icon small class="mr-1" v-text="getBoardIcon(0)" />
						{{ getBoardName(0) }}
					</span>
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

const shown = computed(() => {
	return (machineStore.isConnecting || machineStore.connectingProgress >= 0 || machineStore.isReconnecting || machineStore.isDisconnecting ||
		machineStore.model.state.status === MachineStatus.halted || machineStore.model.state.status === MachineStatus.updating);
});

const isPersistent = computed(() => {
	if (!(displayReset.value && machineStore.isConnected)) {
		// If the connection is gone, allow this dialog only to be dismissed if running as PWA
		return !window.matchMedia("(display-mode: standalone)").matches;
	}
	return false;
});

const message = computed(() => {
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

const isUpdating = computed(() => machineStore.model.state.status === MachineStatus.updating && machineStore.boardsBeingUpdated.length > 0);

// Display of boards being updated

function getBoardIcon(canAddress: number) {
	if (machineStore.boardBeingUpdated == canAddress) {
		return "mdi-arrow-right-bold";
	}
	return updatedBoards.includes(canAddress) ? "mdi-check" : "mdi-asterisk";
}

function getBoardName(canAddress: number) {
	const board = machineStore.model.boards.find(board => board.canAddress === canAddress);
	if (board) {
		return canAddress ? `${board.name ?? i18n.global.t("dialog.connectionProgress.expansionBoard")} (#${canAddress})` : board.name;
	}
	return canAddress ? i18n.global.t("dialog.connectionProgress.board", [canAddress]) : i18n.global.t("dialog.connectionProgress.mainboard");
}


// Tracking of updated boards

const updatedBoards = reactive<Array<number>>([]);

watch(() => machineStore.boardsBeingUpdated, () => {
	updatedBoards.splice(0);
});

watch(() => machineStore.boardBeingUpdated, (to, from) => {
	if (from >= 0) {
		updatedBoards.push(from);
	}
});

// Show reset button after a delay when the machine is halted

const displayReset = ref(false);
let haltedTimer: NodeJS.Timeout | null = null;

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
</script>
