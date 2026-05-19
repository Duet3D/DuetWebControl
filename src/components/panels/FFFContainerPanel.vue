<template>
	<v-row :density="mobile ? 'compact' : 'default'">
		<v-col cols="12" sm="6" md="4" lg="4" xl="4">
			<StatusPanel />
		</v-col>

		<v-col cols="12" sm="6" md="5" lg="5" xl="4">
			<ToolsPanel />
		</v-col>

		<!-- Only apply d-flex to the chart column when there's actually data to chart. Without it,
			 the chart card collapses to fit just the title + noData line on a disconnected dashboard
			 instead of stretching to match the tallest sibling (StatusPanel) and rendering a tall
			 empty placeholder -->
		<v-col v-if="mdAndUp" :class="{ 'd-flex': hasTemperaturesToDisplay }"
			   cols="12" sm="6" md="3" lg="3" xl="4">
			<TemperatureChart />
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import TemperatureChart from "@/components/charts/TemperatureChart.vue";
import ToolsPanel from "./ToolsPanel/ToolsPanel.vue";

// Page-level container that fills the main content area - the container width tracks the
// viewport, so useDisplay is the matching observable. Component-internal adaptation that's
// genuinely container-aware (FileList's auto view mode) uses a ResizeObserver instead
const { mobile, mdAndUp } = useDisplay();

// Mirrors TemperatureChart.hasTemperaturesToDisplay so the column wrapper can drop its d-flex
// when the chart has nothing to draw. Cheap to recompute - both sides re-evaluate on the same
// machine-model patches anyway
const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const hasTemperaturesToDisplay = computed(() =>
	machineStore.model.sensors.analog.some((sensor, sensorIndex) =>
		sensor !== null && (
			machineStore.model.heat.heaters.some(heater => heater !== null && heater.sensor === sensorIndex)
			|| settingsStore.displayedExtraTemperatures.includes(sensorIndex)
		)
	)
);
</script>
