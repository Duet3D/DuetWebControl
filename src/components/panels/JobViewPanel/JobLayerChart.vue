<template>
	<div class="content flex-grow-1 px-2 py-0">
		<canvas ref="canvasRef" />
	</div>
</template>

<style scoped>
.content {
	position: relative;
}

.content > canvas {
	position: absolute;
}
</style>

<script lang="ts">
export interface LayerChartSettings {
	// Drop layer 1 from the chart - its duration is often an outlier that flattens the rest
	hideFirstLayer: boolean;
	// Show every layer rather than only the most recent ones
	showAllLayers: boolean;
	// Number of most recent layers shown when not displaying all layers
	lastLayerCount: number;
}

export const layerChartDefaults: LayerChartSettings = {
	hideFirstLayer: false,
	showAllLayers: false,
	lastLayerCount: 30,
};
</script>

<script setup lang="ts">
import { Chart, LineController, LineElement, LinearScale, PointElement, Tooltip, Legend, Filler, CategoryScale } from "chart.js";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { display, displayZ, displayTime } from "@/utils/display";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const props = defineProps<{
	settings: LayerChartSettings;
}>();

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);

let chart: Chart<"line"> | null = null;

const layers = computed(() => machineStore.model.job.layers);

// Layer 1 is dropped from the dataset (not just scrolled off) when hidden, so the y-axis
// autoscale ignores its often-disproportionate duration
const hideFirst = computed(() => props.settings.hideFirstLayer && layers.value.length > 1);
const chartLayers = computed(() => hideFirst.value ? layers.value.slice(1) : layers.value);
const startLayerNumber = computed(() => hideFirst.value ? 2 : 1);

function updateChart() {
	if (!chart) {
		return;
	}
	const visibleLayers = chartLayers.value;
	const startNumber = startLayerNumber.value;
	chart.data.labels = visibleLayers.map((_, index) => index + startNumber);
	chart.data.datasets[0].data = visibleLayers.map(layer => layer.duration);

	const count = props.settings.lastLayerCount;
	const endNumber = startNumber + visibleLayers.length - 1;
	const xScale = chart.options.scales!.x!;
	if (visibleLayers.length === 0) {
		xScale.min = startNumber;
		xScale.max = startNumber + count - 1;
	} else if (props.settings.showAllLayers) {
		xScale.min = startNumber;
		xScale.max = endNumber;
	} else {
		xScale.min = Math.max(startNumber, endNumber - count);
		xScale.max = Math.max(endNumber, (xScale.min as number) + count);
	}
	chart.update();
}

function applyDarkTheme(active: boolean) {
	if (!chart) {
		return;
	}
	const ticksColor = active ? "#FFF" : "#666";
	const gridLineColor = active ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
	chart.options.scales!.x!.ticks!.color = ticksColor;
	chart.options.scales!.y!.ticks!.color = ticksColor;
	chart.options.scales!.x!.grid!.color = gridLineColor;
	chart.options.scales!.y!.grid!.color = gridLineColor;
	chart.update();
}

onMounted(() => {
	if (!canvasRef.value) {
		return;
	}
	chart = new Chart(canvasRef.value, {
		type: "line",
		options: {
			// The chart is recreated whenever its tab is reopened; without this it would
			// replay its entry animation every time, and every new layer would animate in
			animation: false,
			elements: { line: { tension: 0 } },
			plugins: {
				legend: { display: false },
				tooltip: {
					displayColors: false,
					callbacks: {
						title: (items) => i18n.global.t("chart.layer.layer", [items[0].dataIndex + startLayerNumber.value]),
						label: (item) => {
							const layer = chartLayers.value[item.dataIndex];
							const lines: Array<string> = [i18n.global.t("chart.layer.layerDuration", [displayTime(layer.duration, false)])];
							if (layer.height) {
								lines.push(i18n.global.t("chart.layer.layerHeight", [displayZ(layer.height)]));
							}
							if (layer.filamentUsage) {
								lines.push(i18n.global.t("chart.layer.filamentUsage", [display(layer.filamentUsage, 1, "mm")]));
							}
							if (layer.fractionPrinted) {
								lines.push(i18n.global.t("chart.layer.fractionPrinted", [display(layer.fractionPrinted * 100, 1, "%")]));
							}
							// job.layers[].temperatures is parallel to sensors.analog; keep only the
							// entries backed by a heater so extra and humidity sensors are left out
							if (layer.temperatures && layer.temperatures.length > 0) {
								const heaters = machineStore.model.heat.heaters;
								const heaterTemps = layer.temperatures.filter((_, index) =>
									heaters.some(heater => heater !== null && heater.sensor === index));
								if (heaterTemps.length > 0) {
									lines.push(i18n.global.t("chart.layer.temperatures",
										[heaterTemps.map(t => display(t, 1, "C")).join(", ")]));
								}
							}
							return lines;
						},
					},
				},
			},
			maintainAspectRatio: false,
			scales: {
				x: {
					grid: { color: "rgba(0,0,0,0.2)", display: true },
					ticks: { color: "rgba(0,0,0,0.87)", font: { family: "Roboto,sans-serif" }, maxRotation: 0, stepSize: 5 },
					beginAtZero: true,
				},
				y: {
					grid: { color: "rgba(0,0,0,0.87)", display: true },
					ticks: {
						color: "rgba(0,0,0,0.87)",
						font: { family: "Roboto,sans-serif" },
						callback: (value: string | number) => displayTime(value as number, false),
					},
					beginAtZero: true,
					suggestedMax: 30,
				},
			},
		},
		data: {
			datasets: [{
				borderColor: "rgba(0, 129, 214, 0.8)",
				backgroundColor: "rgba(0, 129, 214, 0.8)",
				fill: false,
				label: i18n.global.t("chart.layer.layerTime"),
				data: [],
			}],
		},
	});
	applyDarkTheme(settingsStore.darkTheme);
	updateChart();
});

onBeforeUnmount(() => {
	chart?.destroy();
	chart = null;
});

watch(() => settingsStore.darkTheme, applyDarkTheme);
watch(() => settingsStore.locale, () => {
	if (chart) {
		chart.data.datasets[0].label = i18n.global.t("chart.layer.layerTime");
		chart.update();
	}
});
watch(layers, updateChart, { deep: true });
watch(() => props.settings.showAllLayers, updateChart);
watch(() => props.settings.hideFirstLayer, updateChart);
watch(() => props.settings.lastLayerCount, updateChart);
</script>
