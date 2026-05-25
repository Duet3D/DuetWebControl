<template>
	<v-autocomplete v-model="checked" :items="entities" item-title="label" item-value="index"
					:label="label" v-hint="label" :disabled="uiStore.uiFrozen" variant="outlined"
					density="comfortable" hide-details chips closable-chips clearable multiple />
</template>

<script setup lang="ts">
import { ProbeType, type Tool } from "@duet3d/objectmodel";

import type { ComponentSettingKind } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const props = defineProps<{
	kind: ComponentSettingKind;
	label: string;
}>();

/**
 * Entity-visibility overlay. `null` inherits the panel default (every listed entity shown); the
 * first edit materialises an explicit index list
 */
const modelValue = defineModel<Array<number> | null>({ required: true });

const machineStore = useMachineStore();
const uiStore = useUiStore();

interface Entity {
	index: number;
	label: string;
}

// A bed/chamber slot only exists if at least one of its mapped heaters is present - empty slots
// stay in the mapping to keep slot indices stable for HeaterRows but must not be offered here
function hasValidHeater(heaterIndices: Array<number>): boolean {
	return heaterIndices.some(heaterIndex =>
		heaterIndex >= 0
		&& heaterIndex < machineStore.model.heat.heaters.length
		&& machineStore.model.heat.heaters[heaterIndex] !== null);
}

// Sensor names often carry a trailing "[group]" suffix; strip it for a compact list label
function sensorName(name: string | null): string | null {
	if (!name) {
		return null;
	}
	const matches = /(.*)\[(.*)\]$/.exec(name);
	return matches ? matches[1].trim() : name;
}

const entities = computed<Array<Entity>>(() => {
	switch (props.kind) {
		case "axes":
			return machineStore.model.move.axes
				.map((axis, index) => ({ axis, index }))
				.filter(item => item.axis.visible)
				.map(item => ({ index: item.index, label: item.axis.letter }));
		case "extruders":
			return machineStore.model.move.extruders.map((_, index) => ({ index, label: `E${index}` }));
		case "tools":
			return machineStore.model.tools
				.filter((tool): tool is Tool => tool !== null)
				.map(tool => ({ index: tool.number, label: tool.name || i18n.global.t("panel.tools.tool", [tool.number]) }));
		case "beds":
			return machineStore.bedHeaterMapping
				.map((heaterIndices, index) => ({ heaterIndices, index }))
				.filter(item => hasValidHeater(item.heaterIndices))
				.map(item => ({ index: item.index, label: i18n.global.t("panel.tools.bed", [item.index]) }));
		case "chambers":
			return machineStore.chamberHeaterMapping
				.map((heaterIndices, index) => ({ heaterIndices, index }))
				.filter(item => hasValidHeater(item.heaterIndices))
				.map(item => ({ index: item.index, label: i18n.global.t("panel.tools.chamber", [item.index]) }));
		case "probes":
			return machineStore.model.sensors.probes
				.map((probe, index) => ({ probe, index }))
				.filter(item => item.probe !== null && item.probe.type !== ProbeType.none)
				.map(item => ({ index: item.index, label: i18n.global.t("panel.status.settings.probe", [item.index]) }));
		case "fans":
			// Tool fan (-1) plus every non-thermostatic (manually controllable) fan
			return [
				{ index: -1, label: i18n.global.t("panel.fans.toolFan") },
				...machineStore.model.fans
					.map((fan, index) => ({ fan, index }))
					.filter(item => item.fan !== null && item.fan.thermostatic.sensors.length === 0)
					.map(item => ({ index: item.index, label: item.fan!.name || i18n.global.t("panel.fans.fan", [item.index]) }))
			];
		case "tachoFans":
			// Fans that report a tacho reading (the ones the status panel can show an RPM for)
			return machineStore.model.fans
				.map((fan, index) => ({ fan, index }))
				.filter(item => item.fan !== null && item.fan.rpm >= 0)
				.map(item => ({ index: item.index, label: item.fan!.name || i18n.global.t("panel.fans.fan", [item.index]) }));
		case "heaters":
			return machineStore.model.heat.heaters
				.map((heater, index) => ({ heater, index }))
				.filter(item => item.heater !== null)
				.map(item => {
					const sensor = machineStore.model.sensors.analog[item.heater!.sensor] ?? null;
					return {
						index: item.index,
						label: sensorName(sensor?.name ?? null) ?? i18n.global.t("chart.temperature.heater", [item.index])
					};
				});
		case "extraSensors":
			// Analog sensors not bound to any heater - the chart's dashed "extra" series
			return machineStore.model.sensors.analog
				.map((sensor, index) => ({ sensor, index }))
				.filter(item => item.sensor !== null
					&& !machineStore.model.heat.heaters.some(heater => heater !== null && heater.sensor === item.index))
				.map(item => ({
					index: item.index,
					label: sensorName(item.sensor!.name) ?? i18n.global.t("chart.temperature.sensor", [item.index])
				}));
		default:
			return [];
	}
});

// Multi-select bound to the array of selected indices. A `null` overlay reads back as "every
// listed entity"; the first edit materialises an explicit array through the setter
const checked = computed<Array<number>>({
	get: () => modelValue.value ?? entities.value.map(entity => entity.index),
	set: (value) => { modelValue.value = value; }
});
</script>
