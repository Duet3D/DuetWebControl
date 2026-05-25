<template>
	<PanelCard v-model:active-title="activeTab" :titles="titles"
			   :class="['d-flex', 'flex-column', shouldFill ? 'flex-grow-1' : '']">
		<v-card-text v-show="activeTab === 0 && hasTemperaturesToDisplay" class="content flex-grow-1 px-2 py-0">
			<canvas ref="canvasRef" />
		</v-card-text>
		<v-card-text v-if="activeTab === 0 && !hasTemperaturesToDisplay" class="pa-0">
			<v-alert type="info" :text="$t('chart.temperature.noData')" tile density="compact" />
		</v-card-text>

		<WebcamView v-if="activeTab === 1" />

		<!-- Download the displayed temperature samples as CSV -->
		<template #title-action-0>
			<v-btn icon="mdi-download" variant="text" size="small" density="comfortable"
				   :disabled="sampleTimes.length === 0" :title="$t('chart.temperature.download')"
				   @click="downloadCsv" />
		</template>

		<!-- Which heater / extra-sensor series the chart draws -->
		<template #settings-0>
			<EntityVisibilityList v-if="hasHeaters" kind="heaters"
								  :label="$t('chart.temperature.settings.heaters')"
								  v-model="settings.displayedHeaters" />
			<EntityVisibilityList v-if="hasExtraSensors" kind="extraSensors"
								  :label="$t('chart.temperature.settings.extraSensors')"
								  v-model="settings.displayedExtraSensors" class="mt-4" />
		</template>
	</PanelCard>
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
import { useComponentSettings } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
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

// Which series are drawn. `null` shows every entity, an array restricts to those indices. Heaters
// default to all-shown; extra sensors start hidden so an unconfigured chart only plots heaters.
// The settings dialog edits these; chart.js legend-click hiding is disabled so this is the single
// source of visibility
const settings = useComponentSettings({
	displayedHeaters: null as Array<number> | null,
	displayedExtraSensors: [] as Array<number> | null
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart<"line"> | null = null;
let lastUpdate = 0;

// Temperatures is always present; Webcam is offered whenever a webcam is configured, matching
// the visibility condition of the Webcam menu item
const titles = computed(() => {
	const list = [{ icon: "mdi-chart-timeline-variant", title: i18n.global.t("chart.temperature.caption") }];
	if (settingsStore.webcam.enabled) {
		list.push({ icon: "mdi-webcam", title: i18n.global.t("panel.webcam.caption") });
	}
	return list;
});

// Falls back to the chart automatically once the Webcam tab is no longer offered
const selectedTab = ref(0);
const activeTab = computed<number>({
	get: () => (selectedTab.value === 1 && settingsStore.webcam.enabled) ? 1 : 0,
	set: (value) => { selectedTab.value = value; }
});

const hasTemperaturesToDisplay = computed(() =>
	machineStore.model.sensors.analog.some(sensor => sensor !== null));

const hasHeaters = computed(() => machineStore.model.heat.heaters.some(heater => heater !== null));
const hasExtraSensors = computed(() =>
	machineStore.model.sensors.analog.some((sensor, index) =>
		sensor !== null && !machineStore.model.heat.heaters.some(heater => heater !== null && heater.sensor === index)));

// The card stretches to match its tallest sibling when it has a chart to draw or a webcam to
// show; otherwise it collapses to the title so a disconnected dashboard stays compact
const shouldFill = computed(() => hasTemperaturesToDisplay.value || settingsStore.webcam.enabled);

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
	const heaters = settings.value.displayedHeaters;
	const extras = settings.value.displayedExtraSensors;
	for (const dataset of sampleSeries) {
		dataset.showLine = dataset.extra
			? (extras === null || extras.includes(dataset.index))
			: (heaters === null || heaters.includes(dataset.index));
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
					// Series visibility is driven by the panel settings, not by clicking the
					// legend - the no-op keeps chart.js from toggling its own hidden state
					onClick: () => { /* visibility is controlled through the panel settings */ },
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

// Editing the displayed-series settings takes effect immediately rather than waiting for the
// next sample tick
watch(settings, () => {
	applyVisibility();
	chart?.update();
}, { deep: true });

// Build a CSV of every currently-displayed series over the rolling sample window
function downloadCsv() {
	const visible = sampleSeries.filter(dataset => dataset.showLine);
	const header = ["Time", ...visible.map(dataset => dataset.label ?? "")];
	const rows = sampleTimes.map((time, sampleIndex) => {
		const cells = visible.map(dataset => {
			const value = dataset.data[sampleIndex];
			return (typeof value === "number" && isFinite(value)) ? String(value) : "";
		});
		return [new Date(time).toISOString(), ...cells].join(",");
	});
	const csv = [header.join(","), ...rows].join("\r\n");

	const blob = new Blob([csv], { type: "text/csv" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = `temperatures-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
	anchor.click();
	URL.revokeObjectURL(url);
}

defineExpose({ hasTemperaturesToDisplay, shouldFill });
</script>
