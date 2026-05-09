<!-- Always-visible global status panel for FFF dashboards (md+).
	 Three-column layout: status info, tools (heaters + sensors), and temperature chart -->
<template>
	<v-row :dense="mobile">
		<v-col cols="12" sm="6" md="4" lg="4" xl="4">
			<StatusPanel />
		</v-col>

		<v-col cols="12" sm="6" md="5" lg="5" xl="4">
			<ToolsPanel />
		</v-col>

		<v-col v-if="hasTemperaturesToDisplay" :class="{ 'd-flex': true }" cols="12" sm="6" md="3" lg="3" xl="4">
			<TemperatureChart />
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";

import ToolsPanel from "./ToolsPanel/ToolsPanel.vue";

// Chart.js is heavy (~70 kB gzipped). Lazy-loading keeps it out of the default-layout chunk so the
// initial paint doesn't pay for it; the chart's own chunk loads in parallel right after
const TemperatureChart = defineAsyncComponent(() => import("@/components/charts/TemperatureChart.vue"));

// Page-level container that fills the main content area - the container width tracks the
// viewport, so useDisplay is the matching observable. Component-internal adaptation that's
// genuinely container-aware (FileList's auto view mode) uses a ResizeObserver instead
const { mobile } = useDisplay();
const machineStore = useMachineStore();
const settingsStore = useSettingsStore();

// Same predicate the chart uses internally - hides the column entirely when nothing would render
const hasTemperaturesToDisplay = computed(() =>
	machineStore.model.sensors.analog.some((sensor, sensorIndex) =>
		sensor !== null && (
			machineStore.model.heat.heaters.some(heater => heater !== null && heater.sensor === sensorIndex)
			|| settingsStore.displayedExtraTemperatures.includes(sensorIndex)
		)
	)
);
</script>
