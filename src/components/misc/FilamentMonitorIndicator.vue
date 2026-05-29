<template>
	<v-tooltip v-if="info" location="top">
		<template #activator="{ props: tooltipProps }">
			<span v-bind="tooltipProps" :class="severityClasses"><slot /></span>
		</template>

		<div class="fm-title">{{ $t("panel.status.filamentMonitor.title", [extruderIndex]) }}</div>

		<svg viewBox="0 0 200 156" class="fm-bar" role="img">
			<!-- Side headers -->
			<text :x="BAR.x - 8" y="9" text-anchor="end" class="fm-head">
				{{ $t("panel.status.filamentMonitor.allowed") }}
			</text>
			<text :x="BAR.x + BAR.w + 8" y="9" text-anchor="start" class="fm-head">
				{{ $t("panel.status.filamentMonitor.current") }}
			</text>

			<!-- Out-of-range (red) background spanning the whole bar, green allowed band on top,
				 warning margins near each permitted bound, live reading drawn as a marker line -->
			<rect :x="BAR.x" :y="BAR.top" :width="BAR.w" :height="BAR.bottom - BAR.top" class="fm-zone-out" />
			<rect :x="BAR.x" :y="geom.green.y" :width="BAR.w" :height="geom.green.h" class="fm-zone-in" />
			<rect :x="BAR.x" :y="geom.warnHigh.y" :width="BAR.w" :height="geom.warnHigh.h" class="fm-zone-warn" />
			<rect :x="BAR.x" :y="geom.warnLow.y" :width="BAR.w" :height="geom.warnLow.h" class="fm-zone-warn" />
			<rect v-if="geom.measured" :x="BAR.x" :y="geom.measured.y" :width="BAR.w" :height="geom.measured.h"
				  class="fm-zone-measured" />
			<rect :x="BAR.x" :y="BAR.top" :width="BAR.w" :height="BAR.bottom - BAR.top" class="fm-outline" />
			<line :x1="BAR.x" :x2="BAR.x + BAR.w" :y1="geom.current.y" :y2="geom.current.y" class="fm-current" />

			<line v-for="(tick, idx) in geom.ticks" :key="`tick-${idx}`"
				  :x1="tick.x1" :x2="tick.x2" :y1="tick.y" :y2="tick.y" class="fm-tick" />
			<text v-for="(label, idx) in geom.labels" :key="`label-${idx}`"
				  :x="label.x" :y="label.y" :text-anchor="label.anchor"
				  dominant-baseline="middle" :class="label.cls">{{ label.text }}</text>
		</svg>
	</v-tooltip>
	<slot v-else />
</template>

<script setup lang="ts">
import { type FilamentMonitor, LaserFilamentMonitor, RotatingMagnetFilamentMonitor } from "@duet3d/objectmodel";

import { useSettingsStore } from "@/stores/settings";

const props = defineProps<{
	monitor: FilamentMonitor | null;
	extruderIndex: number;
}>();

const settingsStore = useSettingsStore();

// SVG layout in viewBox user units. The bar is centred so both label columns have room
const BAR = { x: 84, w: 30, top: 16, bottom: 144 };

interface FilamentMonitorReading {
	configMin: number;
	configMax: number;
	current: number;
	// Calibrated (measured) extrusion range, null until the firmware has recorded a real span
	measMin: number | null;
	measMax: number | null;
}

// Laser and rotating-magnet monitors report a live extrusion percentage (lastPercentage, falling
// back to the running average) alongside their configured permitted range; pulsed, simple and
// unknown monitors don't
const reading = computed<FilamentMonitorReading | null>(() => {
	const monitor = props.monitor;
	if (!(monitor instanceof LaserFilamentMonitor || monitor instanceof RotatingMagnetFilamentMonitor)) {
		return null;
	}
	const configMin = monitor.configured.percentMin, configMax = monitor.configured.percentMax;
	const current = monitor.lastPercentage ?? monitor.avgPercentage;
	if (current === null || configMax <= configMin) {
		return null;
	}
	// The calibrated object defaults to a 0/0 span, so only treat it as available once it holds a
	// real measured range
	const cal = monitor.calibrated;
	const hasMeas = cal !== null && cal.percentMax > cal.percentMin;
	return {
		configMin, configMax, current,
		measMin: hasMeas ? cal.percentMin : null,
		measMax: hasMeas ? cal.percentMax : null,
	};
});

const info = computed(() => {
	const data = reading.value;
	if (data === null) {
		return null;
	}
	// Pad the axis beyond the permitted range, the live reading and the measured range so the red
	// out-of-range zones stay visible even when a value sits on a bound
	const lo = Math.min(data.configMin, data.current, data.measMin ?? data.configMin);
	const hi = Math.max(data.configMax, data.current, data.measMax ?? data.configMax);
	const pad = Math.max((hi - lo) * 0.15, 3);
	return { ...data, axisMin: lo - pad, axisMax: hi + pad };
});

// "err" once the live reading breaks out of the permitted band, "warn" within 10% of the band
// width of either bound - the margin the orange zones below visualise
const severity = computed<"warn" | "err" | null>(() => {
	const data = reading.value;
	if (data === null) {
		return null;
	}
	if (data.current < data.configMin || data.current > data.configMax) {
		return "err";
	}
	const margin = (data.configMax - data.configMin) * 0.1;
	if (data.current <= data.configMin + margin || data.current >= data.configMax - margin) {
		return "warn";
	}
	return null;
});

// Tint the wrapped extruder value to match the severity, reusing the Z-probe colour scheme
const severityClasses = computed(() => {
	switch (severity.value) {
		case "err":
			return ["px-1", "rounded", settingsStore.darkTheme ? "bg-red-darken-3" : "bg-red-lighten-4"];
		case "warn":
			return ["px-1", "rounded", settingsStore.darkTheme ? "bg-orange-darken-2" : "bg-orange-lighten-4"];
		default:
			return [];
	}
});

const geom = computed(() => {
	const data = info.value!;
	const height = BAR.bottom - BAR.top;
	const y = (value: number) => BAR.top + (data.axisMax - value) / (data.axisMax - data.axisMin) * height;

	const yGreenTop = y(data.configMax), yGreenBottom = y(data.configMin);
	const yCurrent = y(data.current);
	const leftX = BAR.x - 8, rightX = BAR.x + BAR.w + 8;

	// Warning bands sit within 10% of the permitted band width inside either bound - the same margin
	// the severity computed uses, so the reading entering orange mirrors the "warn" state
	const margin = (data.configMax - data.configMin) * 0.1;
	const yWarnLow = y(data.configMin + margin), yWarnHigh = y(data.configMax - margin);

	const measured = (data.measMin !== null && data.measMax !== null)
		? { y: y(data.measMax), h: y(data.measMin) - y(data.measMax) }
		: null;

	const labels = [
		{ x: leftX, y: yGreenTop, anchor: "end", cls: "fm-label", text: `${Math.round(data.configMax)}%` },
		{ x: leftX, y: yGreenBottom, anchor: "end", cls: "fm-label", text: `${Math.round(data.configMin)}%` },
		{ x: rightX, y: yCurrent, anchor: "start", cls: "fm-label fm-label-current", text: `${Math.round(data.current)}%` },
	];
	if (data.measMin !== null && data.measMax !== null) {
		// Keep the measured labels from overlapping the current-reading label by pushing the max above
		// and the min below it once they come within one line height
		const gap = 13;
		const yMeasMax = Math.min(y(data.measMax), yCurrent - gap);
		const yMeasMin = Math.max(y(data.measMin), yCurrent + gap);
		labels.push(
			{ x: rightX, y: yMeasMax, anchor: "start", cls: "fm-label fm-label-measured", text: `${Math.round(data.measMax)}%` },
			{ x: rightX, y: yMeasMin, anchor: "start", cls: "fm-label fm-label-measured", text: `${Math.round(data.measMin)}%` }
		);
	}

	return {
		green: { y: yGreenTop, h: yGreenBottom - yGreenTop },
		warnLow: { y: yWarnLow, h: yGreenBottom - yWarnLow },
		warnHigh: { y: yGreenTop, h: yWarnHigh - yGreenTop },
		measured,
		current: { y: yCurrent },
		ticks: [
			{ x1: BAR.x - 4, x2: BAR.x, y: yGreenTop },
			{ x1: BAR.x - 4, x2: BAR.x, y: yGreenBottom },
			{ x1: BAR.x + BAR.w, x2: BAR.x + BAR.w + 4, y: yCurrent },
		],
		labels,
	};
});
</script>

<style scoped>
.fm-title {
	font-weight: 600;
	margin-bottom: 4px;
	text-align: center;
}

.fm-bar {
	width: 200px;
	max-width: 100%;
}

.fm-head {
	fill: currentColor;
	font-size: 9px;
	opacity: 0.7;
}

.fm-label {
	fill: currentColor;
	font-size: 11px;
}

.fm-label-current {
	font-weight: 600;
}

.fm-label-measured {
	fill: black;
}

.fm-tick {
	stroke: currentColor;
	stroke-width: 1;
	opacity: 0.6;
}

.fm-zone-out {
	fill: rgb(229, 57, 53);
}

.fm-zone-in {
	fill: rgb(67, 160, 71);
}

.fm-zone-warn {
	fill: rgb(251, 140, 0);
}

.fm-zone-measured {
	fill: rgb(255, 235, 59);
	opacity: 0.7;
}

.fm-current {
	stroke: currentColor;
	stroke-width: 2.5;
}

.fm-outline {
	fill: none;
	stroke: currentColor;
	stroke-width: 1;
	opacity: 0.5;
}
</style>
