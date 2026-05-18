<template>
	<v-card :class="['d-flex', 'flex-column', hasTemperaturesToDisplay ? 'flex-grow-1' : '']">
		<v-card-title class="pt-2 pb-0">
			<v-icon class="mr-1">mdi-chart-timeline-variant</v-icon>
			{{ $t("chart.temperature.caption") }}
		</v-card-title>

		<v-card-text v-show="hasTemperaturesToDisplay" class="content flex-grow-1 px-2 py-0">
			<canvas ref="canvasRef" />
		</v-card-text>
		<v-card-text v-if="!hasTemperaturesToDisplay" class="pa-0">
			<v-alert type="info" :text="$t('chart.temperature.noData')" tile density="compact" />
		</v-card-text>
	</v-card>
</template>

<style scoped>
.content {
	position: relative;
}

.content > canvas {
	position: absolute;
}
</style>

<script setup lang="ts">
import { Chart, Filler, Legend, LineController, LineElement, LinearScale, PointElement, TimeScale, Tooltip } from "chart.js";
import "chartjs-adapter-date-fns";
import { enUS } from "date-fns/locale/en-US";

import {
	initTemperatureSampling,
	maxSampleTime,
	onSampleAdded,
	sampleSeries,
	sampleTimes,
	type TempChartDataset,
} from "@/composables/useTemperatureSamples";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";

// Chart.js v4 requires explicit component registration; do it once at module load
Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler);

const defaultMinTemperature = 0;
const defaultMaxTemperature = 300;

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();

// Background sampler keeps filling the rolling buffer regardless of whether any chart instance
// is mounted; the call is idempotent so multiple chart mounts are fine
initTemperatureSampling();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart<"line"> | null = null;
let lastUpdate = 0;

const hasTemperaturesToDisplay = computed(() =>
	machineStore.model.sensors.analog.some((sensor, sensorIndex) =>
		sensor !== null && (
			machineStore.model.heat.heaters.some(heater => heater !== null && heater.sensor === sensorIndex)
			|| settingsStore.displayedExtraTemperatures.includes(sensorIndex)
		)
	)
);

const minConfiguredTemperature = computed(() => {
	let min = 0;
	const t = settingsStore.temperatures;
	for (const list of [t.bed.active, t.bed.standby, t.chamber, t.tool.active, t.tool.standby]) {
		for (const value of list) {
			if (value < min) {
				min = value;
			}
		}
	}
	return min;
});

// Lowest configured heater-min across all heaters, ignoring any heater that left the limit
// unset (RRF reports -273.15 in that case - i.e. no lower limit). The chart Y axis falls back
// to defaultMinTemperature (0) when nothing is configured and only drops below when a heater
// genuinely permits a lower target
const minHeaterTemperature = computed(() => {
	let min: number | null = null;
	for (const heater of machineStore.model.heat.heaters) {
		if (heater !== null && heater.min > -273 && (min === null || heater.min < min)) {
			min = heater.min;
		}
	}
	return min;
});

function applyDarkTheme(active: boolean) {
	if (!chart) {
		return;
	}
	const ticksColor = active ? "#FFF" : "#666";
	chart.options!.plugins!.legend!.labels!.color = ticksColor;
	chart.options!.scales!.x!.ticks!.color = ticksColor;
	chart.options!.scales!.y!.ticks!.color = ticksColor;

	const gridColor = active ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
	chart.options!.scales!.x!.grid!.color = gridColor;
	chart.options!.scales!.y!.grid!.color = gridColor;

	chart.update();
}

function refresh() {
	if (!chart) {
		return;
	}
	const now = Date.now();
	if (now - lastUpdate < 1000) {
		return;
	}
	const min = minHeaterTemperature.value;
	const max = machineStore.maxHeaterTemperature;
	chart.options!.scales!.y!.min = Math.min(minConfiguredTemperature.value, min !== null ? min : defaultMinTemperature);
	chart.options!.scales!.y!.max = max !== null ? max : defaultMaxTemperature;
	chart.options!.scales!.x!.min = now - maxSampleTime;
	chart.options!.scales!.x!.max = now;
	chart.update();
	lastUpdate = now;
}

// Per-frame visibility sync runs before the chart redraws; sample collection itself lives in
// the shared module so a torn-down chart never blocks the rolling buffer
function applyVisibility() {
	for (const dataset of sampleSeries) {
		dataset.showLine = !dataset.extra || settingsStore.displayedExtraTemperatures.includes(dataset.index);
	}
}

function onSample() {
	applyVisibility();
	refresh();
}

let unsubscribeSampleListener: (() => void) | null = null;

onMounted(() => {
	if (!canvasRef.value) {
		return;
	}
	chart = new Chart<"line">(canvasRef.value, {
		type: "line",
		options: {
			animation: false,
			elements: { line: { tension: 0 } },
			plugins: {
				legend: {
					labels: {
						filter: (legendItem, data) => !!(data.datasets[legendItem.datasetIndex!] as TempChartDataset).showLine,
						font: { family: "Roboto,sans-serif" }
					}
				}
			},
			maintainAspectRatio: false,
			responsive: true,
			scales: {
				x: {
					type: "time",
					adapters: { date: { locale: enUS } },
					grid: { display: true },
					ticks: { font: { family: "Roboto,sans-serif" } },
					min: Date.now() - maxSampleTime,
					max: Date.now(),
					time: { unit: "minute", displayFormats: { minute: "HH:mm" } }
				},
				y: {
					grid: { display: true },
					ticks: { font: { family: "Roboto,sans-serif" }, stepSize: 50 },
					min: 0,
					max: defaultMaxTemperature
				}
			}
		},
		data: {
			labels: sampleTimes,
			datasets: sampleSeries
		}
	});

	applyDarkTheme(settingsStore.darkTheme);
	applyVisibility();
	refresh();

	unsubscribeSampleListener = onSampleAdded(onSample);
});

onBeforeUnmount(() => {
	unsubscribeSampleListener?.();
	unsubscribeSampleListener = null;
	chart?.destroy();
	chart = null;
});

watch(() => settingsStore.darkTheme, (to) => applyDarkTheme(to));

defineExpose({ hasTemperaturesToDisplay });
</script>
