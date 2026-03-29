<!-- "Extra" tab of the ToolsPanel. Lists every analog sensor that is not bound to a heater, with a switch
	 to add or remove it from the persistent set of sensors plotted in the TemperatureChart -->
<template>
	<table v-if="extraSensors.length > 0" class="ml-2 mr-2">
		<colgroup>
			<col style="width: 50%">
			<col style="width: 25%">
			<col style="width: 25%">
		</colgroup>
		<thead>
			<tr>
				<th class="d-none d-md-table-cell"></th>
				<th>
					{{ $t("panel.tools.extra.sensor") }}
				</th>
				<th>
					{{ $t("panel.tools.extra.value") }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="extraSensor in extraSensors" :key="`extra-${extraSensor.index}`">
				<td class="d-none d-md-table-cell">
					<v-switch class="ml-3" :model-value="settingsStore.displayedExtraTemperatures.includes(extraSensor.index)"
							  @update:model-value="settingsStore.toggleExtraVisibility(extraSensor.index)"
							  :label="$t('panel.tools.extra.showInChart')" :disabled="uiStore.uiFrozen"
							  hide-details density="compact" />
				</td>
				<th class="py-2" :class="getExtraColor(extraSensor.index)">
					{{ formatExtraName(extraSensor) }}
				</th>
				<td class="py-2">
					{{ displaySensorValue(extraSensor.sensor) }}
				</td>
			</tr>
		</tbody>
	</table>
	<v-alert v-else type="info">
		{{ $t("panel.tools.extra.noItems") }}
	</v-alert>
</template>

<style scoped>
table {
	width: 100%;
	border-spacing: 0;
}

table td,
table th {
	text-align: center;
}
</style>

<script setup lang="ts">
import type { AnalogSensor } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import { getExtraColor } from "@/utils/colors";
import { displaySensorValue } from "@/utils/display";

interface ExtraSensor {
	sensor: AnalogSensor;
	index: number;
}

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const extraSensors = computed<Array<ExtraSensor>>(() => {
	const heaters = machineStore.model.heat.heaters;
	return machineStore.model.sensors.analog
		.map((sensor, index) => ({ sensor, index }))
		.filter(({ sensor, index }) => sensor !== null && !heaters.some(heater => heater !== null && heater.sensor === index)) as Array<ExtraSensor>;
});

function formatExtraName(sensor: ExtraSensor) {
	if (sensor.sensor.name) {
		const matches = /(.*)\[(.*)\]$/.exec(sensor.sensor.name);
		if (matches) {
			return matches[1];
		}
		return sensor.sensor.name;
	}
	return i18n.global.t("panel.tools.extra.sensorIndex", [sensor.index]);
}
</script>
