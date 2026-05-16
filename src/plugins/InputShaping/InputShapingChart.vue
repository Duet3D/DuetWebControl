<!-- Chart panel for the InputShaping plugin. Renders either a frequency-domain view (frequencies
	 array supplied) or a sample-time view (samples but no frequencies). Plots:
	 - the raw amplitudes per axis (when `value` is provided)
	 - one damping curve per selected built-in shaper, plus a curve for the custom shaper
	 - a vertical line marking the configured ringing frequency
	 In sample-view mode the user can drag-select a range to feed back via update:sampleStartIndex
	 / update:sampleEndIndex; double-click clears the range -->
<template>
	<canvas ref="chartCanvas" @mousedown="onMouseDown" @mousemove="onMouseMove" @dblclick="onDoubleClick" />
</template>

<script setup lang="ts">
import type { ChartConfiguration, ChartDataset, ChartEvent, LegendElement, LegendItem, TooltipItem } from "chart.js";
import { Chart } from "chart.js";
import { getInputShaperDamping, getInputShaperFactors, InputShaperType } from "@duet3d/motionanalysis";
import { InputShapingType } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useSettingsStore } from "@/stores/settings";

import "./RangePlugin";
import "./VLinePlugin";

interface InputShapingDataset extends ChartDataset<"line"> {
	isShaperFrequency?: boolean;
	isCustom?: boolean;
}

const props = defineProps<{
	frequencies?: Array<number>;
	ringingFrequency?: number;
	value?: Record<string, number[]> | null;
	showValues?: boolean;
	inputShapers?: Array<string>;
	inputShaperFrequency?: number;
	inputShaperDamping?: number;
	customAmplitudes?: Array<number>;
	customDelays?: Array<number>;
	estimateShaperEffect?: boolean;
	wideBand?: boolean;
}>();

const sampleStartIndex = defineModel<number | null>("sampleStartIndex", { default: null });
const sampleEndIndex = defineModel<number | null>("sampleEndIndex", { default: null });

const settingsStore = useSettingsStore();

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart<"line"> | undefined;
let dragStart: number | null = null;
let isUpdating = false;

const showValuesEffective = computed(() => props.showValues ?? true);

const showReduction = computed(() => {
	const hasCustom = (props.customAmplitudes?.length ?? 0) > 0 && (props.customDelays?.length ?? 0) > 0;
	const hasShapers = (props.inputShapers?.length ?? 0) > 0;
	return (hasCustom || hasShapers) && !props.estimateShaperEffect;
});

const resolution = computed(() => {
	const freqs = props.frequencies;
	return freqs && freqs.length > 2 ? freqs[1] - freqs[0] : 0;
});

const lineAtPoint = computed(() => {
	const freqs = props.frequencies;
	if (!freqs || freqs.length < 2 || !props.ringingFrequency) {
		return -1;
	}
	let point = -1;
	let delta = Infinity;
	for (let i = 0; i < freqs.length; i++) {
		const nextDelta = Math.abs(freqs[i] - props.ringingFrequency);
		if (point === -1 || nextDelta < delta) {
			point = i;
			delta = nextDelta;
		}
	}
	return delta > resolution.value ? -1 : point;
});

// #region Chart setup
function buildOptions(): any {
	return {
		animation: false,
		hover: { mode: "nearest", intersect: true },
		maintainAspectRatio: false,
		plugins: {
			legend: {
				labels: {},
				onClick(_e: ChartEvent, legendItem: LegendItem, legend: LegendElement<"line">) {
					const index = legendItem.datasetIndex!;
					const ci = legend.chart;
					const meta = ci.getDatasetMeta(index);

					(meta as any).hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;

					// Hiding the shaper-frequency overlay drops the vertical-line marker too
					if ((ci.data.datasets[index] as InputShapingDataset).isShaperFrequency) {
						(ci.config as ChartConfiguration).lineAtIndex = meta.hidden ? [] : [lineAtPoint.value];
					}

					ci.update();
				},
			},
			range: {},
			vline: { lineColor: "#1010FF", lineWidth: 2 },
			tooltip: {
				enabled: true,
				callbacks: {
					label(tooltipItem: TooltipItem<"line">) {
						let label = tooltipItem.dataset.label || "";
						if (label) {
							label += ": ";
						}
						const precision = props.estimateShaperEffect ? 10000 : 1000;
						label += Math.round((tooltipItem.parsed.y ?? 0) * precision) / precision;
						return label;
					},
					title(items: Array<TooltipItem<"line">>) {
						if (props.frequencies) {
							return i18n.global.t("plugins.accelerometer.frequencyTooltip",
								[props.frequencies[items[0].dataIndex].toFixed(1), (resolution.value / 2).toFixed(1)]);
						}
						return i18n.global.t("plugins.accelerometer.sampleTooltip", [items[0].dataIndex + 1]);
					},
				},
			},
		},
		scales: {
			x: {
				display: true,
				grid: { display: true },
				title: {
					display: true,
					text: props.frequencies && props.frequencies.length > 0
						? i18n.global.t("plugins.accelerometer.xAxisFrequency")
						: i18n.global.t("plugins.accelerometer.xAxisSample"),
				},
				ticks: { font: { family: "Roboto,sans-serif" }, maxTicksLimit: 20 },
				beginAtZero: true,
			},
			y: {
				display: !!props.value,
				grid: { display: true },
				title: {
					display: true,
					text: props.frequencies && props.frequencies.length > 0
						? i18n.global.t("plugins.accelerometer.yAxisAmplitude")
						: i18n.global.t("plugins.accelerometer.yAxisAcceleration"),
				},
				ticks: { font: { family: "Roboto,sans-serif" } },
			},
			damping: {
				display: showReduction.value,
				grid: { display: true },
				position: props.value ? "right" : "left",
				title: { display: true, text: i18n.global.t("plugins.accelerometer.reductionFactor") },
				min: 0,
				max: 1,
			},
		},
	};
}

function getLineColor(index: number): string {
	const colors = [
		"#4dc9f6", "#f67019", "#f53794", "#537bc4", "#acc236",
		"#166a8f", "#00a950", "#58595b", "#8549ba"
	];
	return colors[index % colors.length];
}

function applyDarkTheme(active: boolean) {
	if (!chart) return;
	const ticksColor = active ? "#FFF" : "#666";
	const opt = chart.options as any;
	opt.plugins.legend.labels.color = ticksColor;
	opt.scales.x.ticks.color = ticksColor;
	opt.scales.x.title.color = ticksColor;
	opt.scales.y.ticks.color = ticksColor;
	opt.scales.y.title.color = ticksColor;
	opt.scales.damping.ticks.color = ticksColor;
	opt.scales.damping.title.color = ticksColor;

	const gridLineColor = active ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
	opt.scales.x.grid.color = gridLineColor;
	opt.scales.y.grid.color = gridLineColor;
	opt.scales.damping.grid.color = gridLineColor;

	chart.update();
}

// Rebuild datasets in-place. Hidden-dataset state is preserved across rebuilds via the
// dataset.label round-trip so toggling a legend entry survives a re-render
function updateDatasets() {
	if (!chart) return;

	const hiddenLabels = chart.data.datasets
		.filter((_dataset, index) => !chart!.isDatasetVisible(index))
		.map((dataset) => dataset.label);

	chart.data.labels = [];
	chart.data.datasets = [];

	// Raw amplitude per axis
	let numSamples = 0;
	if (props.value) {
		for (const key of Object.keys(props.value)) {
			const series = props.value[key];
			if (showValuesEffective.value) {
				chart.data.datasets.push({
					borderColor: getLineColor(chart.data.datasets.length),
					backgroundColor: getLineColor(chart.data.datasets.length),
					pointBorderWidth: 0.25,
					pointRadius: 2,
					borderWidth: 1.25,
					data: series,
					fill: false,
					label: key,
				});
			}
			numSamples = Math.max(numSamples, series.length);
		}
	}

	(chart.options as any).scales.x.min = 0;
	(chart.options as any).scales.x.max = numSamples;
	chart.data.labels = props.frequencies && props.frequencies.length > 0
		? props.frequencies.map((freq) => Math.round(freq).toString())
		: Array.from({ length: numSamples }, (_, i) => i);

	// Add the vertical-line marker dataset whenever there's a ringing frequency we can pin
	if (lineAtPoint.value !== -1 && chart.data.datasets.length > 0) {
		(chart.config as ChartConfiguration).lineAtIndex = [lineAtPoint.value];
		chart.data.datasets.push({
			borderColor: "#1010FF",
			backgroundColor: "#1010FF",
			data: [],
			label: i18n.global.t("plugins.accelerometer.shaperFrequency"),
			isShaperFrequency: true,
		} as InputShapingDataset);
	} else {
		(chart.config as ChartConfiguration).lineAtIndex = [];
	}

	// Damping curves for the selected built-in shapers
	if (props.inputShaperFrequency && props.frequencies && props.frequencies.length > 0 && props.inputShapers) {
		for (const shaperType of props.inputShapers) {
			if (shaperType === "none" || shaperType === "custom") {
				continue;
			}
			if (!(shaperType in InputShapingType)) {
				console.warn(`Unsupported shaper type ${shaperType}`);
				continue;
			}

			const factors = getInputShaperFactors(shaperType as InputShaperType, props.inputShaperFrequency, props.inputShaperDamping ?? 0.1);
			const damping = getInputShaperDamping(props.frequencies, factors.amplitudes, factors.durations);

			if (props.estimateShaperEffect && props.value) {
				for (const key of Object.keys(props.value)) {
					chart.data.datasets.push({
						borderColor: getLineColor(chart.data.datasets.length),
						backgroundColor: getLineColor(chart.data.datasets.length),
						pointBorderWidth: 0.25,
						pointRadius: 0,
						borderDash: showValuesEffective.value ? [5, 5] : undefined,
						borderWidth: 1.25,
						data: props.value[key].map((value, index) => value * damping[index]),
						fill: false,
						label: `${key} + ${shaperType.toUpperCase()}`,
					});
				}
			} else {
				chart.data.datasets.push({
					borderColor: getLineColor(chart.data.datasets.length),
					backgroundColor: getLineColor(chart.data.datasets.length),
					pointBorderWidth: 0,
					pointRadius: 0,
					borderDash: [5, 5],
					borderWidth: 1.25,
					data: damping,
					fill: false,
					label: shaperType.toUpperCase(),
					yAxisID: "damping",
				});
			}
		}
	}

	// Damping curve for custom shaper coefficients (separate path because it's not enum-driven)
	if (props.inputShapers?.includes("custom") && props.frequencies && props.frequencies.length > 0
		&& props.customAmplitudes && props.customDelays
		&& props.customAmplitudes.length > 0 && props.customDelays.length > 0) {
		const damping = getInputShaperDamping(props.frequencies, props.customAmplitudes, props.customDelays);
		if (props.estimateShaperEffect && props.value) {
			for (const key of Object.keys(props.value)) {
				chart.data.datasets.push({
					borderColor: getLineColor(chart.data.datasets.length),
					backgroundColor: getLineColor(chart.data.datasets.length),
					pointBorderWidth: 0,
					pointRadius: 0,
					borderDash: showValuesEffective.value ? [5, 5] : undefined,
					borderWidth: 1.25,
					data: props.value[key].map((value, index) => value * damping[index]),
					fill: false,
					label: `${key} + ${i18n.global.t("plugins.accelerometer.custom")}`,
				});
			}
		} else {
			chart.data.datasets.push({
				borderColor: getLineColor(chart.data.datasets.length),
				backgroundColor: getLineColor(chart.data.datasets.length),
				pointBorderWidth: 0,
				pointRadius: 0,
				borderDash: [10, 5],
				borderWidth: 1.25,
				data: damping,
				fill: false,
				label: i18n.global.t("plugins.accelerometer.custom"),
				yAxisID: "damping",
				isCustom: true,
			} as InputShapingDataset);
		}
	}

	// The damping-curve datasets may have pushed the dataset count past zero after the first
	// check missed it; second chance for the shaper-frequency overlay
	const hasShaperFreq = (chart.data.datasets as Array<InputShapingDataset>)
		.some((d) => d.isShaperFrequency);
	if (!hasShaperFreq && lineAtPoint.value !== -1 && chart.data.datasets.length > 0) {
		(chart.config as ChartConfiguration).lineAtIndex = [lineAtPoint.value];
		chart.data.datasets.push({
			borderColor: "#1010FF",
			backgroundColor: "#1010FF",
			data: [],
			label: i18n.global.t("plugins.accelerometer.shaperFrequency"),
			isShaperFrequency: true,
		} as InputShapingDataset);
	}

	// Clip the X axis to the wide-band / narrow-band frequency range
	if (props.frequencies && props.frequencies.length > 0) {
		const maxFrequency = props.wideBand ? 500 : 100;
		let maxFrequencyIndex = -1;
		for (const freq of props.frequencies) {
			if (Math.round(freq) > maxFrequency) {
				break;
			}
			maxFrequencyIndex++;
		}
		if (maxFrequencyIndex > 0) {
			for (const dataset of chart.data.datasets) {
				if (!(dataset as InputShapingDataset).isShaperFrequency) {
					dataset.data.splice(maxFrequencyIndex + 1);
				}
			}
			chart.data.labels!.splice(maxFrequencyIndex + 1);
			(chart.options as any).scales.x.max = maxFrequencyIndex;
		}
	}

	const opt = chart.options as any;
	opt.scales.x.title.text = props.frequencies && props.frequencies.length > 0
		? i18n.global.t("plugins.accelerometer.xAxisFrequency")
		: i18n.global.t("plugins.accelerometer.xAxisSample");
	opt.scales.y.title.text = props.frequencies && props.frequencies.length > 0
		? i18n.global.t("plugins.accelerometer.yAxisAmplitude")
		: i18n.global.t("plugins.accelerometer.yAxisAcceleration");
	opt.scales.y.display = !!props.value;
	opt.scales.damping.display = showReduction.value;
	opt.scales.damping.position = props.value ? "right" : "left";

	for (const dataset of chart.data.datasets) {
		if (hiddenLabels.includes(dataset.label)) {
			dataset.hidden = true;
		}
	}
}

function scheduleUpdate() {
	if (!isUpdating) {
		isUpdating = true;
		nextTick(() => {
			updateDatasets();
			chart?.update();
			isUpdating = false;
		});
	}
}

// #endregion

// #region Mouse interactions for sample-range selection
function onMouseDown(e: MouseEvent) {
	if (!chart || (props.frequencies && props.frequencies.length > 0)) {
		// Range selection only makes sense in sample-view mode
		return;
	}

	const activePoints = chart.getElementsAtEventForMode(e, "nearest", { intersect: false }, false);
	if (activePoints && activePoints.length > 0) {
		dragStart = activePoints[0].index;
		(chart.config as ChartConfiguration).range = { start: (e as any).layerX };
		chart.update();
		document.addEventListener("mouseup", onMouseUp);
	}
}

function onMouseMove(e: MouseEvent) {
	if (!chart) return;
	const cfg = chart.config as ChartConfiguration;
	if (cfg.range) {
		cfg.range.end = (e as any).layerX;
		chart.update();
	}
}

function onMouseUp(e: MouseEvent) {
	document.removeEventListener("mouseup", onMouseUp);
	if (!chart) return;
	const cfg = chart.config as ChartConfiguration;
	if (cfg.range && cfg.range.end) {
		const activePoints = chart.getElementsAtEventForMode(e, "nearest", { intersect: false }, false);
		if (activePoints && activePoints.length > 0 && dragStart !== null) {
			const dragEnd = activePoints[0].index;
			if (Math.abs(dragEnd - dragStart) > 4) {
				sampleStartIndex.value = Math.min(dragStart, dragEnd);
				sampleEndIndex.value = Math.max(dragStart, dragEnd);
			}
			dragStart = null;
		}
	}
	(chart.config as ChartConfiguration).range = undefined;
	chart.update();
}

function onDoubleClick() {
	sampleStartIndex.value = null;
	sampleEndIndex.value = null;
}

// #endregion

// #region Lifecycle
onMounted(() => {
	if (!chartCanvas.value) return;
	chart = new Chart(chartCanvas.value, {
		type: "line",
		options: buildOptions(),
		data: { datasets: [], labels: [] },
	});
	updateDatasets();
	applyDarkTheme(settingsStore.darkTheme);
});

onBeforeUnmount(() => {
	// Drop the document-level mouseup listener if the user unmounted mid-drag - otherwise the
	// handler keeps firing against a disposed chart instance
	document.removeEventListener("mouseup", onMouseUp);
	chart?.destroy();
	chart = undefined;
});

// #endregion

// #region Watches
function arraysDiffer(a: unknown, b: unknown): boolean {
	if (!(a instanceof Array) || !(b instanceof Array)) {
		return a !== b;
	}
	if (a.length !== b.length) {
		return true;
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return true;
		}
	}
	return false;
}

watch(() => props.frequencies, (to, from) => {
	if (arraysDiffer(to, from)) {
		scheduleUpdate();
	}
});

watch([
	() => props.ringingFrequency,
	() => props.value,
	() => props.showValues,
	() => props.inputShaperFrequency,
	() => props.inputShaperDamping,
	() => props.estimateShaperEffect,
	() => props.wideBand,
], () => scheduleUpdate());

watch(() => props.inputShapers, (to, from) => {
	if (arraysDiffer(to, from)) {
		scheduleUpdate();
	}
}, { deep: true });

watch(() => props.customAmplitudes, () => {
	if (!chart) return;
	if (props.customAmplitudes && props.customDelays) {
		for (const dataset of chart.data.datasets) {
			if ((dataset as InputShapingDataset).isCustom) {
				(dataset as InputShapingDataset).data = props.frequencies
					? getInputShaperDamping(props.frequencies, props.customAmplitudes, props.customDelays)
					: [];
				scheduleUpdate();
				return;
			}
		}
		scheduleUpdate();
	}
}, { deep: true });

watch(() => props.customDelays, () => {
	if (!chart) return;
	if (props.customAmplitudes && props.customDelays) {
		for (const dataset of chart.data.datasets) {
			if ((dataset as InputShapingDataset).isCustom) {
				(dataset as InputShapingDataset).data = props.frequencies
					? getInputShaperDamping(props.frequencies, props.customAmplitudes, props.customDelays)
					: [];
				scheduleUpdate();
				return;
			}
		}
		scheduleUpdate();
	}
}, { deep: true });

watch(() => settingsStore.darkTheme, (to) => applyDarkTheme(to));
watch(() => settingsStore.locale, () => scheduleUpdate());

watch(sampleStartIndex, (to) => {
	if (chart && (!props.frequencies || props.frequencies.length === 0)) {
		(chart.options as any).scales.x.min = to === null || Number.isNaN(to) ? 0 : to;
		chart.update();
	}
});

watch(sampleEndIndex, (to) => {
	if (chart && (!props.frequencies || props.frequencies.length === 0)) {
		(chart.options as any).scales.x.max = to === null || Number.isNaN(to)
			? chart.data.labels!.length
			: to;
		chart.update();
	}
});

// #endregion
</script>
