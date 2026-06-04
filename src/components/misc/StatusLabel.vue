<style scoped>
.status-label {
	border-radius: 5px;
}
</style>

<template>
	<span class="px-2 text-title-small status-label" :class="statusClass">
		{{ statusText }}
	</span>
</template>

<script setup lang="ts">
import { MachineMode, MachineStatus } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";

const machineStore = useMachineStore();

const statusText = computed(() => {
	let type: string = machineStore.model.state.status;
	if (!machineStore.model.state.status) {
		type = "unknown";
	} else if (machineStore.model.state.status === MachineStatus.processing && machineStore.model.state.machineMode === MachineMode.fff) {
		type = "printing";
	}
	return i18n.global.t(`generic.status.${type}`);
});

// Direct Vuetify utility-class strings per status. A CSS-variable / theme-token mapping would
// be cleaner once we have a richer status-color palette, but the literal classes are easy to
// audit and keep the lookup synchronous
const statusClass = computed(() => {
	switch (machineStore.model.state.status) {
		case MachineStatus.disconnected:
		case MachineStatus.off:
			return "bg-red-darken-1 text-white";
		case MachineStatus.starting:
		case MachineStatus.simulating:
			return "bg-light-blue-lighten-3";
		case MachineStatus.updating:
			return "bg-blue-lighten-3";
		case MachineStatus.halted:
		case MachineStatus.cancelling:
			return "bg-red text-white";
		case MachineStatus.pausing:
		case MachineStatus.resuming:
			return "bg-orange-lighten-1";
		case MachineStatus.paused:
			return "bg-yellow-lighten-1";
		case MachineStatus.processing:
			return "bg-green text-white";
		case MachineStatus.busy:
			return "bg-amber text-white";
		case MachineStatus.changingTool:
			return "bg-blue-lighten-5";
		case MachineStatus.idle:
			return "bg-light-green-lighten-4";
		default:
			return "bg-red text-white";
	}
});
</script>
