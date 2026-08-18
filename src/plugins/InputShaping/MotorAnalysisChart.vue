<style scoped>
.chart-container {
	position: relative;
	width: 100%;
	height: 100%;
	min-height: 260px;
}
.chart-container canvas {
	position: absolute;
}
</style>

<template>
	<div class="chart-container">
		<canvas ref="canvas" />
	</div>
</template>

<script setup lang="ts">
import type { ChartOptions, TooltipItem } from "chart.js";
import { BarController, BarElement, CategoryScale, Chart, Legend, LineController, LineElement, LinearScale, LogarithmicScale, PointElement, Tooltip } from "chart.js";
Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, LogarithmicScale, Tooltip, Legend);
import type { FrequencyAnalysisResult, MotorHarmonicsResult, MotorSweepSummary } from "@duet3d/motionanalysis";

import i18n from "@/i18n";
import { useSettingsStore } from "@/stores/settings";

import "./VLinePlugin";

import type { MotorSweepResult, MotorView } from "./motorProfiles";

const props = defineProps<{
	axes: Array<string>;
	harmonics: MotorHarmonicsResult | null;
	spectrum: FrequencyAnalysisResult | null;
	sweep: MotorSweepResult | null;
	summary: MotorSweepSummary | null;
	view: MotorView;
	yAxisTitle: string;
}>();

const settingsStore = useSettingsStore();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart<"bar" | "line"> | null = null;

function getColor(index: number): string {
	const colors = ["#4dc9f6", "#f67019", "#f53794", "#537bc4", "#acc236", "#166a8f", "#00a950", "#58595b", "#8549ba"];
	return colors[index % colors.length];
}

function buildOptions(): ChartOptions<"bar" | "line"> {
	return {
		animation: false,
		maintainAspectRatio: false,
		plugins: {
			legend: { labels: {} },
			vline: { lineColor: "#1010FF", lineWidth: 1 },
			tooltip: {
				callbacks: {
					title(items: Array<TooltipItem<"bar" | "line">>) {
						switch (props.view) {
							case "spectrum": return i18n.global.t("plugins.accelerometer.frequencyTooltip", [props.spectrum!.frequencies[items[0].dataIndex].toFixed(1), (props.spectrum!.frequencies[0] / 2).toFixed(1)]);
							case "sweep": return i18n.global.t("plugins.accelerometer.sweepTooltip", [props.sweep!.fullStepFrequencies[items[0].dataIndex].toFixed(1), (props.sweep!.feedrates[items[0].dataIndex] / 60).toFixed(1)]);
							case "summary": return `${(items[0].parsed.x ?? 0).toFixed(1)} Hz`;
							default: return i18n.global.t("plugins.accelerometer.harmonicTooltip", [props.harmonics!.orders[items[0].dataIndex], props.harmonics!.frequencies[items[0].dataIndex].toFixed(1)]);
						}
					},
					label(item: TooltipItem<"bar" | "line">) {
						return `${item.dataset.label}: ${(item.parsed.y ?? 0).toPrecision(4)}`;
					},
				},
			},
		},
		scales: {
			x: {
				grid: { display: false },
				ticks: { autoSkip: true, maxRotation: 0 },
				title: { display: true, text: "" },
			},
			y: {
				beginAtZero: true,
				grid: {},
				ticks: {},
				title: { display: true, text: "" },
			},
		},
	};
}

function applyDarkTheme(active: boolean) {
	if (!chart) {
		return;
	}
	const ticksColor = active ? "#FFF" : "#666";
	const scales = chart.options.scales!;
	chart.options.plugins!.legend!.labels!.color = ticksColor;
	scales.x!.ticks!.color = ticksColor;
	scales.x!.title!.color = ticksColor;
	scales.y!.ticks!.color = ticksColor;
	scales.y!.title!.color = ticksColor;
	scales.y!.grid!.color = active ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
	chart.update();
}

function updateChart() {
	if (!chart) {
		return;
	}

	const scales = chart.options.scales!;
	scales.y!.title!.text = props.yAxisTitle;
	// The summary spans more than a decade of absolute frequency, so it gets a logarithmic x axis with real x/y points instead of categories
	scales.x!.type = (props.view === "summary") ? "logarithmic" : "category";
	if (props.view === "summary" && props.summary) {
		chart.data.labels = [];
		chart.data.datasets = props.summary.amplitudes.map((amplitudes, index) => ({
			type: "line" as const,
			label: `${props.summary!.orders[index]}x`,
			data: amplitudes.map((amplitude, frequencyIndex) => (amplitude !== null) ? { x: props.summary!.frequencies[frequencyIndex], y: amplitude } : null).filter((point): point is { x: number; y: number } => point !== null),
			borderColor: getColor(index),
			backgroundColor: getColor(index),
			borderWidth: 1.5,
			pointRadius: 3,
			fill: false,
		})).filter((dataset, index) => (props.summary!.orders[index] < 1 || Number.isInteger(props.summary!.orders[index])) && dataset.data.length > 0);
		scales.x!.title!.text = i18n.global.t("plugins.accelerometer.xAxisFrequency");
		chart.config.lineAtIndex = [];
	} else if (props.view === "sweep" && props.sweep) {
		chart.data.labels = props.sweep.fullStepFrequencies.map((frequency) => frequency.toFixed(1));
		chart.data.datasets = props.sweep.amplitudes.map((amplitudes, index) => ({
			type: "line",
			label: `${props.sweep!.orders[index]}x`,
			data: amplitudes,
			borderColor: getColor(index),
			backgroundColor: getColor(index),
			borderWidth: 1.5,
			pointRadius: 3,
			fill: false,
		}));
		scales.x!.title!.text = i18n.global.t("plugins.accelerometer.xAxisFullStepFrequency");
		chart.config.lineAtIndex = [];
	} else if (props.view === "spectrum" && props.spectrum) {
		chart.data.labels = props.spectrum.frequencies.map((frequency) => Math.round(frequency).toString());
		chart.data.datasets = props.spectrum.amplitudes.map((amplitudes, index) => ({
			type: "line",
			label: props.axes[index],
			data: amplitudes,
			borderColor: getColor(index),
			backgroundColor: getColor(index),
			borderWidth: 1.25,
			pointRadius: 0,
			fill: false,
		}));
		scales.x!.title!.text = i18n.global.t("plugins.accelerometer.xAxisFrequency");

		// Mark the harmonics on the spectrum
		const resolution = props.spectrum.frequencies[0];
		chart.config.lineAtIndex = props.harmonics
			? props.harmonics.frequencies.map((frequency) => Math.round(frequency / resolution) - 1).filter((index) => index >= 0 && index < props.spectrum!.frequencies.length)
			: [];
	} else if (props.view === "harmonics" && props.harmonics) {
		chart.data.labels = props.harmonics.frequencies.map((frequency, index) => `${props.harmonics!.orders[index]}x (${frequency.toFixed(1)} Hz)`);
		chart.data.datasets = props.harmonics.amplitudes.map((amplitudes, index) => ({
			type: "bar",
			label: props.axes[index],
			data: amplitudes,
			backgroundColor: getColor(index),
		}));
		scales.x!.title!.text = i18n.global.t("plugins.accelerometer.xAxisHarmonic");
		chart.config.lineAtIndex = [];
	} else {
		chart.data.labels = [];
		chart.data.datasets = [];
		chart.config.lineAtIndex = [];
	}
	chart.update();
}

onMounted(() => {
	chart = new Chart(canvas.value!, {
		type: "bar",
		data: { labels: [], datasets: [] },
		options: buildOptions(),
	});
	applyDarkTheme(settingsStore.darkTheme);
	updateChart();
});

onBeforeUnmount(() => {
	chart?.destroy();
	chart = null;
});

watch(() => [props.harmonics, props.spectrum, props.sweep, props.summary, props.view, props.yAxisTitle], () => updateChart());
watch(() => settingsStore.darkTheme, (to) => applyDarkTheme(to));
</script>
