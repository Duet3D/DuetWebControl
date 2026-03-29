<!-- Per-layer duration bar chart fed from job.layers. Tooltip annotates each layer with height,
	 filament use, fraction printed and the recorded temperatures when those fields are populated -->
<template>
	<v-card class="d-flex flex-column flex-grow-1">
		<v-card-title class="d-flex align-center">
			<v-icon size="small" class="mr-1">mdi-vector-polyline</v-icon>
			{{ $t("chart.layer.caption") }}
			<v-spacer />
			<a v-show="layers.length > 2" href="javascript:void(0)" class="text-subtitle-2"
			   @click.prevent="showAllLayers = !showAllLayers">
				{{ showAllLayers
					? $t("chart.layer.showLastLayers", [Math.min(layers.length, 30)])
					: $t("chart.layer.showAllLayers") }}
			</a>
		</v-card-title>

		<v-card-text class="content flex-grow-1 px-2 py-0">
			<canvas ref="canvasRef" />
		</v-card-text>
	</v-card>
</template>

<style scoped>
.content {
	position: relative;
	min-height: 180px;
}

.content > canvas {
	position: absolute;
}
</style>

<script setup lang="ts">
import { Chart, LineController, LineElement, LinearScale, PointElement, Tooltip, Legend, Filler, CategoryScale } from "chart.js";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { display, displayZ, displayTime } from "@/utils/display";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const showAllLayers = ref(false);

let chart: Chart<"line"> | null = null;

const layers = computed(() => machineStore.model.job.layers);

function updateChart() {
	if (!chart) {
		return;
	}
	chart.data.labels = layers.value.map((_, index) => index + 1);
	chart.data.datasets[0].data = layers.value.map(layer => layer.duration);

	const xScale = chart.options.scales!.x!;
	if (showAllLayers.value) {
		xScale.min = 1;
		xScale.max = layers.value.length;
	} else {
		xScale.min = Math.max(layers.value.length > 2 ? 2 : 1, layers.value.length - 30);
		xScale.max = Math.max(30, layers.value.length);
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
			elements: { line: { tension: 0 } },
			plugins: {
				legend: { display: false },
				tooltip: {
					displayColors: false,
					callbacks: {
						title: (items) => i18n.global.t("chart.layer.layer", [items[0].dataIndex + 1]),
						label: (item) => {
							const layer = layers.value[item.dataIndex];
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
							if (layer.temperatures && layer.temperatures.length > 0) {
								lines.push(i18n.global.t("chart.layer.temperatures",
									[layer.temperatures.map(t => display(t, 1, "C")).join(", ")]));
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
watch(showAllLayers, updateChart);
</script>
