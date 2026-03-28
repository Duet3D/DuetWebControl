<!-- Always-visible global status panel for FFF dashboards (md+).
	 Composes StatusPanel + TemperatureChart; ToolsPanel is the remaining piece - lots of subordinate
	 widgets (ControlInput, HeaterRows, ToolRows, ResetHeaterFaultDialog, ...) - and lands separately -->
<template>
	<v-row :dense="mobile">
		<v-col cols="12" sm="6" md="4" lg="4" xl="4">
			<StatusPanel />
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

// Chart.js is heavy (~70 kB gzipped). Lazy-loading keeps it out of the default-layout chunk so the
// initial paint doesn't pay for it; the chart's own chunk loads in parallel right after
const TemperatureChart = defineAsyncComponent(() => import("@/components/charts/TemperatureChart.vue"));

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
