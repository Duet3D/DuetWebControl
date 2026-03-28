<template>
	<v-card class="d-flex flex-column flex-grow-1">
		<v-card-title class="pt-2 pb-0">
			<v-icon class="mr-1">mdi-chart-timeline-variant</v-icon>
			{{ $t("chart.temperature.caption") }}
		</v-card-title>

		<v-card-text v-show="hasTemperaturesToDisplay" class="content flex-grow-1 px-2 py-0">
			<canvas ref="canvasRef" />
		</v-card-text>
		<template v-if="!hasTemperaturesToDisplay">
			<v-spacer />
			<v-card-text class="pa-0">
				<v-alert type="info" :text="$t('chart.temperature.noData')" tile />
			</v-card-text>
		</template>
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
import type { ChartDataset } from "chart.js";
import { Chart, Filler, Legend, LineController, LineElement, LinearScale, PointElement, TimeScale, Tooltip } from "chart.js";
import "chartjs-adapter-date-fns";
import { enUS } from "date-fns/locale/en-US";
import type { AnalogSensor } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import Events from "@/utils/events";

// Chart.js v4 requires explicit component registration; do it once at module load
Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler);

// Sample-recording cadence and the rolling-window length (10 min). Higher cadences eat memory; the
// chart redraws every sample so this also caps the redraw rate
const sampleInterval = 1000;
const maxSampleTime = 600_000;

const defaultMinTemperature = 0;
const defaultMaxTemperature = 300;

// Hardcoded palette (Material-style hexes). Avoids the v3.7-dev "render a span and read its computed
// colour" trick which depended on Vuetify 2 colour utility classes that no longer exist in Vuetify 4
const heaterPalette = [
	"#1976D2", "#D32F2F", "#388E3C", "#F57C00", "#616161", "#827717", "#212121",
	"#7B1FA2", "#FBC02D", "#00796B", "#5D4037", "#E64A19", "#C2185B", "#455A64"
];
function getHeaterColor(index: number, isExtra: boolean): string {
	const slot = isExtra ? heaterPalette.length - index - 1 : index;
	const wrapped = ((slot % heaterPalette.length) + heaterPalette.length) % heaterPalette.length;
	return heaterPalette[wrapped];
}

interface ExtraDatasetValues {
	index: number;
	extra: boolean;
	locale: string;
	rawLabel: string | null;
}
type TempChartDataset = ChartDataset<"line"> & ExtraDatasetValues;

function makeDataset(index: number, extra: boolean, label: string, numSamples: number): TempChartDataset {
	const color = getHeaterColor(index, extra);
	return {
		index,
		extra,
		label,
		fill: false,
		backgroundColor: color,
		borderColor: color,
		borderDash: extra ? [10, 5] : undefined,
		borderWidth: 2,
		data: new Array<number>(numSamples).fill(NaN),
		locale: i18n.global.locale.value as unknown as string,
		pointRadius: 0,
		pointHitRadius: 0,
		rawLabel: null,
		showLine: true
	};
}

// Single-machine state - v3.7-dev kept this in a per-hostname Map for its multi-machine UI; we shed
// that complexity in the next branch since only one connection lives in the store
const sampleTimes: Array<number> = [];
const sampleSeries: Array<TempChartDataset> = [];

function pushSeriesData(index: number, extra: boolean, sensor: AnalogSensor) {
	let dataset = sampleSeries.find(item => item.index === index && item.extra === extra);

	const currentLocale = i18n.global.locale.value as unknown as string;
	if (!dataset || dataset.locale !== currentLocale || dataset.rawLabel !== sensor.name) {
		let name: string;
		if (sensor.name) {
			const matches = /(.*)\[(.*)\]$/.exec(sensor.name);
			name = matches ? matches[1] : sensor.name;
		} else if (extra) {
			name = i18n.global.t("chart.temperature.sensor", [index]);
		} else {
			name = i18n.global.t("chart.temperature.heater", [index]);
		}

		if (dataset) {
			dataset.rawLabel = sensor.name;
			dataset.label = name;
			dataset.locale = currentLocale;
		} else {
			dataset = makeDataset(index, extra, name, sampleTimes.length);
			sampleSeries.push(dataset);
		}
	}

	dataset.data!.push(sensor.lastReading !== null ? sensor.lastReading : NaN);
}

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();

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

const minHeaterTemperature = computed(() => {
	let min: number | null = null;
	for (const heater of machineStore.model.heat.heaters) {
		if (heater !== null && (min === null || heater.min < min)) {
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
	(chart.options!.scales!.x!.grid as any).color = gridColor;
	(chart.options!.scales!.y!.grid as any).color = gridColor;

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

function recordSamples() {
	const now = Date.now();
	if (sampleTimes.length > 0 && now - sampleTimes[sampleTimes.length - 1] < sampleInterval) {
		return;
	}
	machineStore.model.sensors.analog.forEach((sensor, sensorIndex) => {
		if (sensor === null) {
			return;
		}
		const heaterIndex = machineStore.model.heat.heaters.findIndex(heater => heater !== null && heater.sensor === sensorIndex);
		if (heaterIndex !== -1) {
			pushSeriesData(heaterIndex, false, sensor);
		} else {
			pushSeriesData(sensorIndex, true, sensor);
		}
	});

	while (sampleTimes.length > 0 && now - sampleTimes[0] > maxSampleTime) {
		sampleTimes.shift();
		sampleSeries.forEach(dataset => dataset.data!.shift());
	}
	sampleTimes.push(now);

	for (const dataset of sampleSeries) {
		dataset.showLine = !dataset.extra || settingsStore.displayedExtraTemperatures.includes(dataset.index);
	}
	refresh();
}

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
			labels: sampleTimes as unknown as Array<string>,
			datasets: sampleSeries
		}
	});

	applyDarkTheme(settingsStore.darkTheme);

	Events.on("modelUpdated", recordSamples);
});

onBeforeUnmount(() => {
	Events.off("modelUpdated", recordSamples);
	chart?.destroy();
	chart = null;
});

watch(() => settingsStore.darkTheme, (to) => applyDarkTheme(to));
</script>
