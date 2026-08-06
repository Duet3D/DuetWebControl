<style scoped>
.content {
	position: relative;
}

.content > canvas {
	position: absolute;
}
</style>

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

			<!-- Custom calculated series -->
			<div class="d-flex align-center mt-4">
				<v-autocomplete :model-value="customChartIds" :items="settings.customChartData"
								item-title="name" item-value="id" :label="$t('chart.temperature.custom.label')"
								variant="outlined" density="comfortable" hide-details chips multiple readonly
								class="flex-grow-1">
					<template #chip="{ item }">
						<v-chip closable @click.stop="openEdit(customItemOf(item).id)"
								@click:close="removeCustomItem(customItemOf(item).id)">
							{{ customItemOf(item).name }}
						</v-chip>
					</template>
				</v-autocomplete>
				<v-btn icon="mdi-plus" variant="text" class="ms-2" :title="$t('chart.temperature.custom.add')"
					   @click="openAdd" />
			</div>

			<v-row v-if="hasRightAxisCustom" no-gutters class="mt-4">
				<v-col cols="6" class="pe-2">
					<v-text-field v-model.number="settings.customChartRightAxis.min" type="number"
								  :label="$t('chart.temperature.custom.rightAxisMin')" variant="outlined"
								  density="comfortable" hide-details />
				</v-col>
				<v-col cols="6" class="ps-2">
					<v-text-field v-model.number="settings.customChartRightAxis.max" type="number"
								  :label="$t('chart.temperature.custom.rightAxisMax')" variant="outlined"
								  density="comfortable" hide-details />
				</v-col>
			</v-row>
		</template>
	</PanelCard>

	<CustomChartDataDialog v-model:shown="customDialogShown" v-model:items="settings.customChartData"
						   :edit-id="customEditId" />
</template>

<script setup lang="ts">
import { useTheme } from "vuetify";

import { Chart, Filler, Legend, LineController, LineElement, LinearScale, PointElement, TimeScale, Tooltip } from "chart.js";
import "chartjs-adapter-date-fns";
import { enUS } from "date-fns/locale/en-US";

import { type CustomChartItem, type CustomChartRightAxis, initTemperatureSampling, maxSampleTime, onSampleAdded, registerCustomChartItems, sampleSeries, sampleTimes, type TempChartDataset } from "@/composables/useTemperatureSamples";
import CustomChartDataDialog from "@/components/dialogs/CustomChartDataDialog.vue";
import { resolveComponentId, useComponentSettings } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { saveBlob } from "@/utils/download";

// Chart.js v4 requires explicit component registration; do it once at module load
Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler);

const defaultMinTemperature = 0;
const defaultMaxTemperature = 300;

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const theme = useTheme();

// Background sampler keeps filling the rolling buffer regardless of whether any chart instance
// is mounted; the call is idempotent so multiple chart mounts are fine
initTemperatureSampling();

// Which series are drawn. `null` shows every entity, an array restricts to those indices. Heaters
// default to all-shown; extra sensors start hidden so an unconfigured chart only plots heaters.
// The settings dialog edits these; chart.js legend-click hiding is disabled so this is the single
// source of visibility
const settings = useComponentSettings({
	displayedHeaters: null as Array<number> | null,
	displayedExtraSensors: [] as Array<number> | null,
	customChartData: [] as Array<CustomChartItem>,
	customChartRightAxis: { min: 0, max: 100 } as CustomChartRightAxis
});

// Sampling of the custom series is driven by the shared sampler, not by this instance being mounted
registerCustomChartItems(resolveComponentId(), () => settings.value.customChartData);

const customChartIds = computed(() => settings.value.customChartData.map(item => item.id));
const hasRightAxisCustom = computed(() =>
	settings.value.customChartData.some(item => item.visible && item.axis === "right"));

function removeCustomItem(id: string) {
	settings.value.customChartData = settings.value.customChartData.filter(item => item.id !== id);
}

const customDialogShown = ref(false);
const customEditId = ref<string | null>(null);
function openAdd() {
	customEditId.value = null;
	customDialogShown.value = true;
}
function openEdit(id: string) {
	customEditId.value = id;
	customDialogShown.value = true;
}

// The autocomplete chip slot hands over Vuetify's wrapped list item (`.raw` holds our object); fall
// back to the value itself in case a build passes the raw item directly
function customItemOf(item: unknown): CustomChartItem {
	return ((item as { raw?: CustomChartItem }).raw ?? item) as CustomChartItem;
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart<"line"> | null = null;
let lastUpdate = 0;

// chart.js hooks the push/shift calls on every dataset's data array and resolves the owning
// dataset by index, so a series dropped from sampleSeries leaves those hooks pointing past the end
// of the array until the next redraw. Redraws are throttled to 1 Hz, so the following sample
// throws from inside chart.js and takes down the object-model update that emitted it - which in
// turn strands the reconnect that was waiting on it. Hand the chart a snapshot so its indices only
// ever change while it is updating
function updateChart() {
	if (!chart) {
		return;
	}
	chart.data.datasets = [...sampleSeries];
	chart.update();
}

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

function applyChartTheme() {
	if (!chart) {
		return;
	}
	// chart.js can't read CSS vars, so resolve theme tokens to concrete colours: the legend (top
	// header) and axis ticks use the card-title grey, the gridlines the lighter chart-grid token
	const { colors } = theme.current.value;
	const textColor = colors["card-title"] as string;
	const gridColor = colors["chart-grid"] as string;

	chart.options!.plugins!.legend!.labels!.color = textColor;
	chart.options!.scales!.x!.ticks!.color = textColor;
	chart.options!.scales!.y!.ticks!.color = textColor;
	chart.options!.scales!.y2!.ticks!.color = textColor;
	chart.options!.scales!.x!.grid!.color = gridColor;
	chart.options!.scales!.y!.grid!.color = gridColor;

	updateChart();
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

	const y2 = chart.options!.scales!.y2!;
	y2.display = hasRightAxisCustom.value;
	y2.min = settings.value.customChartRightAxis.min;
	y2.max = settings.value.customChartRightAxis.max;

	updateChart();
	lastUpdate = now;
}

// Per-frame visibility sync runs before the chart redraws; sample collection itself lives in
// the shared module so a torn-down chart never blocks the rolling buffer
function applyVisibility() {
	const heaters = settings.value.displayedHeaters;
	const extras = settings.value.displayedExtraSensors;
	const customById = new Map(settings.value.customChartData.map(item => [item.id, item]));
	for (const dataset of sampleSeries) {
		if (dataset.custom) {
			const item = dataset.customId ? customById.get(dataset.customId) : undefined;
			dataset.showLine = item?.visible ?? false;
			if (item) {
				dataset.yAxisID = item.axis === "right" ? "y2" : "y";
			}
			continue;
		}
		dataset.showLine = dataset.extra
			? (extras === null || extras.includes(dataset.index))
			: (heaters === null || heaters.includes(dataset.index));
	}
}

function onSample() {
	applyVisibility();
	refresh();
	// refresh() reindexes the scrolled buffer and drops chart.js's own touch tooltip; re-anchor it
	// to the held finger so it survives object-model updates during a drag
	if (touchTooltipPos !== null) {
		applyTouchTooltip();
	}
}

// While a finger is on the chart, chart.js shows the tooltip live from its own touch handling; we
// only record the position so it can be restored after an update, and clear it on lift so the
// tooltip stays hidden by default and only appears while touching or dragging
let touchTooltipPos: { x: number; y: number } | null = null;

function recordTouch(event: TouchEvent) {
	const touch = event.touches[0];
	if (!touch || !canvasRef.value) {
		return;
	}
	const rect = canvasRef.value.getBoundingClientRect();
	touchTooltipPos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

// Re-anchor the tooltip to the recorded finger position. `index` interaction picks the sample
// nearest the touched x, so the tooltip keeps following the finger even after the buffer scrolled
function applyTouchTooltip() {
	if (!chart || !touchTooltipPos || sampleTimes.length === 0) {
		return;
	}
	const time = chart.scales.x.getValueForPixel(touchTooltipPos.x);
	if (time === undefined) {
		return;
	}
	let index = 0, closest = Infinity;
	for (let i = 0; i < sampleTimes.length; i++) {
		const distance = Math.abs(sampleTimes[i] - time);
		if (distance < closest) {
			closest = distance;
			index = i;
		}
	}
	const active: Array<{ datasetIndex: number; index: number }> = [];
	sampleSeries.forEach((dataset, datasetIndex) => {
		if (dataset.showLine) {
			active.push({ datasetIndex, index });
		}
	});
	chart.setActiveElements(active);
	chart.tooltip?.setActiveElements(active, touchTooltipPos);
	updateChart();
}

// Touch has no pointer-leave event, so a tapped tooltip would stay on screen indefinitely. Clear
// it when the finger lifts so the tooltip only shows while touching or dragging across the chart
function hideTooltip() {
	touchTooltipPos = null;
	if (!chart) {
		return;
	}
	chart.setActiveElements([]);
	chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
	updateChart();
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
			// "nearest along the x-axis, don't require hovering the (invisible, 0-radius) point
			// itself" - lets the tooltip trigger anywhere over the chart at a given time
			interaction: { mode: "index", intersect: false },
			plugins: {
				legend: {
					// Series visibility is driven by the panel settings, not by clicking the
					// legend - the no-op keeps chart.js from toggling its own hidden state
					onClick: () => { /* visibility is controlled through the panel settings */ },
					labels: {
						filter: (legendItem, data) => !!(data.datasets[legendItem.datasetIndex!] as TempChartDataset).showLine,
						font: { family: "Roboto,sans-serif", weight: "bold" },
						boxHeight: 12
					}
				},
				tooltip: {
					// Index mode surfaces every dataset at the hovered time, including ones the
					// panel settings hid (showLine false) or that had no reading (NaN) then
					filter: (item) => {
						const dataset = item.dataset as TempChartDataset;
						return dataset.showLine === true && typeof item.parsed.y === "number" && !isNaN(item.parsed.y);
					},
					callbacks: {
						label: (item) => {
							const dataset = item.dataset as TempChartDataset;
							const unit = dataset.unit ? ` ${dataset.unit}` : "";
							return `${dataset.label}: ${(item.parsed.y as number).toFixed(1)}${unit}`;
						}
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
				},
				// Secondary axis for custom series that opt into the right scale; shown only when one
				// is actually using it (toggled in refresh()). No grid to avoid doubled gridlines
				y2: {
					position: "right",
					display: false,
					grid: { display: false },
					ticks: { font: { family: "Roboto,sans-serif" } },
					min: settings.value.customChartRightAxis.min,
					max: settings.value.customChartRightAxis.max
				}
			}
		},
		data: {
			labels: sampleTimes,
			datasets: [...sampleSeries]
		}
	});

	applyChartTheme();
	applyVisibility();
	refresh();

	unsubscribeSampleListener = onSampleAdded(onSample);

	canvasRef.value.addEventListener("touchstart", recordTouch, { passive: true });
	canvasRef.value.addEventListener("touchmove", recordTouch, { passive: true });
	canvasRef.value.addEventListener("touchend", hideTooltip);
	canvasRef.value.addEventListener("touchcancel", hideTooltip);

	// The canvas is created before the surrounding page-fill height is guaranteed to be in place,
	// so re-measure once the layout has settled to avoid a too-tall first-frame measurement
	nextTick(() => chart?.resize());
});

onBeforeUnmount(() => {
	unsubscribeSampleListener?.();
	unsubscribeSampleListener = null;
	canvasRef.value?.removeEventListener("touchstart", recordTouch);
	canvasRef.value?.removeEventListener("touchmove", recordTouch);
	canvasRef.value?.removeEventListener("touchend", hideTooltip);
	canvasRef.value?.removeEventListener("touchcancel", hideTooltip);
	chart?.destroy();
	chart = null;
});

watch(() => settingsStore.darkTheme, () => applyChartTheme());

// Apply settings edits at once, bypassing refresh()'s 1s throttle, so series visibility and the
// right-axis range aren't delayed until the next sample tick
watch(settings, () => {
	applyVisibility();
	lastUpdate = 0;
	refresh();
}, { deep: true });

// Build a CSV of every currently-displayed series over the rolling sample window
function downloadCsv() {
	const visible = sampleSeries.filter(dataset => dataset.showLine);
	const header = ["Time", ...visible.map(dataset => dataset.unit ? `${dataset.label} (${dataset.unit})` : (dataset.label ?? ""))];
	const rows = sampleTimes.map((time, sampleIndex) => {
		const cells = visible.map(dataset => {
			const value = dataset.data[sampleIndex];
			return (typeof value === "number" && isFinite(value)) ? String(value) : "";
		});
		return [new Date(time).toISOString(), ...cells].join(",");
	});
	const csv = [header.join(","), ...rows].join("\r\n");

	const blob = new Blob([csv], { type: "text/csv" });
	saveBlob(`temperatures-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`, blob);
}
</script>
