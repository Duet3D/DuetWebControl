<!-- Default landing page. Branches between FFF and CNC dashboards on dashboardMode / live machineMode -->
<route lang="json">
{
	"meta": {
		"menu": {
			"category": "control",
			"icon": "mdi-tune",
			"caption": "menu.control.dashboard",
			"order": 10
		}
	}
}
</route>

<template>
	<div class="mb-3">
		<FFFDashboardPanel v-if="isFFForUnset" />
		<CNCDashboardPanel v-else />
	</div>
</template>

<script setup lang="ts">
import { MachineMode } from "@duet3d/objectmodel";

import CNCDashboardPanel from "@/components/panels/CNCDashboardPanel.vue";
import FFFDashboardPanel from "@/components/panels/FFFDashboardPanel.vue";
import { useMachineStore } from "@/stores/machine";
import { DashboardMode, useSettingsStore } from "@/stores/settings";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();

const isFFForUnset = computed(() => {
	if (settingsStore.dashboardMode === DashboardMode.default) {
		return !machineStore.model.state.machineMode || machineStore.model.state.machineMode === MachineMode.fff;
	}
	return settingsStore.dashboardMode === DashboardMode.fff;
});
</script>
