<!-- Default landing page. Branches between FFF and CNC dashboards on dashboardMode / live machineMode.
	 The CNC dashboard is not yet ported; until then CNC machines fall through to a placeholder card -->
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
		<v-card v-else>
			<v-card-title>{{ $t("panel.cncDashboard.caption") }}</v-card-title>
			<v-card-text>{{ $t("panel.cncDashboard.notPorted") }}</v-card-text>
		</v-card>
	</div>
</template>

<script setup lang="ts">
import { MachineMode } from "@duet3d/objectmodel";

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
