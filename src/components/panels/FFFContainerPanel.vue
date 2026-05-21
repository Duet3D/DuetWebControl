<template>
	<v-row :density="mobile ? 'compact' : 'default'">
		<v-col cols="12" sm="6" md="4" lg="4" xl="4">
			<StatusPanel />
		</v-col>

		<v-col cols="12" sm="6" md="5" lg="5" xl="4">
			<ToolsPanel />
		</v-col>

		<!-- Only apply d-flex to the chart column when the panel has something to stretch - a chart
			 to draw or a webcam to show. Without it, the card collapses to just the title on a
			 disconnected dashboard instead of matching the tallest sibling (StatusPanel) and
			 rendering a tall empty placeholder -->
		<v-col v-if="mdAndUp" :class="{ 'd-flex': chartColumnFills }"
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

// Mirrors TemperatureChart.shouldFill so the column wrapper can drop its d-flex when the panel
// has nothing to stretch. Cheap to recompute - both sides re-evaluate on the same machine-model
// patches anyway
const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const chartColumnFills = computed(() =>
	settingsStore.webcam.enabled
	|| machineStore.model.sensors.analog.some(sensor => sensor !== null)
);
</script>
