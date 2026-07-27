import type { ChartDataset } from "chart.js";
import { AnalogSensorType, MachineStatus, type AnalogSensor } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { parseNameWithUnit } from "@/utils/display";
import { evaluateExpression } from "@/utils/expression";
import Events from "@/utils/events";

/**
 * Scale a custom series is plotted against
 */
export type CustomChartAxis = "left" | "right";

/**
 * User-defined chart series evaluating an object-model expression
 */
export interface CustomChartItem {
	id: string;
	name: string;
	value: string;
	unit: string;
	visible: boolean;
	axis: CustomChartAxis;
}

/**
 * Range of the secondary (right-hand) axis custom series can opt into
 */
export interface CustomChartRightAxis {
	min: number;
	max: number;
}

// Sample-recording cadence and the rolling-window length (10 min). Higher cadences eat memory;
// every consumer that draws from these samples should debounce / cap its own redraw rate
const sampleInterval = 1000;
export const maxSampleTime = 600_000;

// Hardcoded Material-style palette. Resolves the heater color synchronously instead of going
// through a hidden-span + getComputedStyle round-trip, which depended on theme classes that
// the framework no longer ships
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
	// Unit parsed from a trailing "[unit]" suffix in the source name (heater/sensor name, or
	// custom series name); null for a custom series whose name carries no suffix
	unit: string | null;
	// Custom (user-defined, expression-driven) series carry their definition id instead of a
	// sensor/heater index
	custom?: boolean;
	customId?: string;
}
export type TempChartDataset = ChartDataset<"line"> & ExtraDatasetValues;

// Custom series get their own palette so they stay visually distinct from heater/sensor lines
const customPalette = [
	"#9C27B0", "#0097A7", "#FF5722", "#3F51B5", "#AFB42B", "#E91E63", "#795548", "#607D8B"
];

function makeDataset(index: number, extra: boolean, label: string, unit: string | null, numSamples: number): TempChartDataset {
	const color = getHeaterColor(index, extra);
	return {
		index,
		extra,
		label,
		unit,
		fill: false,
		backgroundColor: color,
		borderColor: color,
		borderDash: extra ? [10, 5] : undefined,
		borderWidth: 2,
		data: new Array<number>(numSamples).fill(NaN),
		locale: i18n.global.locale.value,
		pointRadius: 0,
		pointHitRadius: 0,
		rawLabel: null,
		showLine: true
	};
}

function makeCustomDataset(item: CustomChartItem, paletteIndex: number, numSamples: number): TempChartDataset {
	const color = customPalette[((paletteIndex % customPalette.length) + customPalette.length) % customPalette.length];
	return {
		index: -1,
		extra: false,
		custom: true,
		customId: item.id,
		label: item.name,
		unit: item.unit || null,
		fill: false,
		backgroundColor: color,
		borderColor: color,
		borderWidth: 2,
		data: new Array<number>(numSamples).fill(NaN),
		locale: i18n.global.locale.value,
		pointRadius: 0,
		pointHitRadius: 0,
		rawLabel: null,
		showLine: item.visible,
		yAxisID: item.axis === "right" ? "y2" : "y"
	};
}

// Shared rolling buffers. Consumers (chart instances) read these directly and call their own
// redraw on the `sampleAdded` event so a kept-alive or unmounted chart never blocks collection
export const sampleTimes: Array<number> = [];
export const sampleSeries: Array<TempChartDataset> = [];

const sampleListeners = new Set<() => void>();

export function onSampleAdded(listener: () => void): () => void {
	sampleListeners.add(listener);
	return () => sampleListeners.delete(listener);
}

function pushSeriesData(index: number, extra: boolean, sensor: AnalogSensor): TempChartDataset {
	let dataset = sampleSeries.find(item => item.index === index && item.extra === extra);

	const currentLocale = i18n.global.locale.value;
	if (!dataset || dataset.locale !== currentLocale || dataset.rawLabel !== sensor.name) {
		const parsed = parseNameWithUnit(sensor.name);
		let name: string;
		if (sensor.name) {
			name = parsed.name ?? sensor.name;
		} else if (extra) {
			name = i18n.global.t("chart.temperature.sensor", [index]);
		} else {
			name = i18n.global.t("chart.temperature.heater", [index]);
		}
		const unit = parsed.unit ?? ((sensor.type === AnalogSensorType.dhtHumidity) ? "%RH" : "°C");

		if (dataset) {
			dataset.rawLabel = sensor.name;
			dataset.label = name;
			dataset.locale = currentLocale;
			dataset.unit = unit;
		} else {
			dataset = makeDataset(index, extra, name, unit, sampleTimes.length);
			sampleSeries.push(dataset);
		}
	}

	dataset.data!.push(sensor.lastReading !== null ? sensor.lastReading : NaN);
	return dataset;
}

// Custom series belong to the chart component that displays them, but sampling has to keep running
// for all of them no matter which chart is currently rendered. Chart instances register a getter
// during setup and never unregister, keyed by their settings id so a remount replaces its own entry
const customItemProviders = new Map<string, () => ReadonlyArray<CustomChartItem>>();

/**
 * Register the custom series of a chart component for continuous sampling
 * @param id Settings id of the registering component
 * @param provider Returns the definitions currently configured on that component
 */
export function registerCustomChartItems(id: string, provider: () => ReadonlyArray<CustomChartItem>): void {
	customItemProviders.set(id, provider);
}

// Union of every registered chart's definitions, keyed by id so two charts sharing a series sample it once
function collectCustomItems(): Array<CustomChartItem> {
	const items = new Map<string, CustomChartItem>();
	for (const provider of customItemProviders.values()) {
		for (const item of provider()) {
			items.set(item.id, item);
		}
	}
	return [...items.values()];
}

// Reconcile the custom datasets with the current definitions and append one evaluated value to each.
// Runs in the same tick as the sensor samples (before the trim) so all series stay length-aligned
function recordCustomSamples(model: Record<string, unknown>) {
	const items = collectCustomItems();

	// Drop datasets whose definition no longer exists
	for (let i = sampleSeries.length - 1; i >= 0; i--) {
		const dataset = sampleSeries[i];
		if (dataset.custom && !items.some(item => item.id === dataset.customId)) {
			sampleSeries.splice(i, 1);
		}
	}

	items.forEach((item, paletteIndex) => {
		let dataset = sampleSeries.find(entry => entry.custom && entry.customId === item.id);
		if (!dataset) {
			dataset = makeCustomDataset(item, paletteIndex, sampleTimes.length);
			sampleSeries.push(dataset);
		} else {
			// Reflect edits to name / unit / axis / visibility without dropping the collected history
			dataset.label = item.name;
			dataset.unit = item.unit || null;
			dataset.yAxisID = item.axis === "right" ? "y2" : "y";
			dataset.showLine = item.visible;
		}
		dataset.data!.push(evaluateExpression(item.value, model));
	});
}

function recordSamples() {
	const machineStore = useMachineStore();

	// Skip while disconnected: on a reset the object model is torn down and repopulated incrementally,
	// so sensors.analog can already be present while heat.heaters is still empty. Recording in that
	// window classifies heater sensors as extra sensors and desyncs their series, which makes the
	// heater lines look frozen once the model settles again
	if (!machineStore.isConnected || machineStore.model.state.status === MachineStatus.disconnected) {
		return;
	}

	const now = Date.now();
	if (sampleTimes.length > 0 && now - sampleTimes[sampleTimes.length - 1] < sampleInterval) {
		return;
	}
	const liveSeries = new Set<TempChartDataset>();
	machineStore.model.sensors.analog.forEach((sensor, sensorIndex) => {
		if (sensor === null) {
			return;
		}
		const heaterIndex = machineStore.model.heat.heaters.findIndex(heater => heater !== null && heater.sensor === sensorIndex);
		if (heaterIndex !== -1) {
			liveSeries.add(pushSeriesData(heaterIndex, false, sensor));
		} else {
			liveSeries.add(pushSeriesData(sensorIndex, true, sensor));
		}
	});

	// Drop datasets of heaters and sensors that are gone from the object model, else a series removed
	// from config.g keeps its legend entry until DWC is reloaded. This also covers a sensor that lost
	// its heater and is now sampled again under its extra-sensor key
	for (let i = sampleSeries.length - 1; i >= 0; i--) {
		if (!sampleSeries[i].custom && !liveSeries.has(sampleSeries[i])) {
			sampleSeries.splice(i, 1);
		}
	}

	recordCustomSamples(machineStore.model as unknown as Record<string, unknown>);

	while (sampleTimes.length > 0 && now - sampleTimes[0] > maxSampleTime) {
		sampleTimes.shift();
		sampleSeries.forEach(dataset => dataset.data!.shift());
	}
	sampleTimes.push(now);

	// Keep every series length-aligned with sampleTimes. A series only receives a value on ticks where
	// its sensor resolves to the same (index, extra) key; a sensor that reads null for a tick or is
	// briefly reclassified would otherwise fall permanently behind and render as a frozen line
	for (const dataset of sampleSeries) {
		while (dataset.data!.length < sampleTimes.length) {
			dataset.data!.push(NaN);
		}
	}

	for (const listener of sampleListeners) {
		listener();
	}
}

let initialized = false;

// Idempotent. Call once at app boot - the listener stays bound forever, so sample collection
// runs continuously regardless of whether a chart instance is currently rendered
export function initTemperatureSampling(): void {
	if (initialized) {
		return;
	}
	initialized = true;
	Events.on("modelUpdated", recordSamples);
}
