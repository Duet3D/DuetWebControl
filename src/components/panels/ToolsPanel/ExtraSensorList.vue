<template>
	<table v-if="sensors.length > 0" class="ml-2 mr-2 mb-2">
		<colgroup>
			<col style="width: 50%">
			<col style="width: 50%">
		</colgroup>
		<thead>
			<tr>
				<th>{{ $t("panel.tools.extra.sensor") }}</th>
				<th>{{ $t("panel.tools.extra.value") }}</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="extraSensor in sensors" :key="`extra-${extraSensor.index}`">
				<th class="py-2" :class="getExtraColor(extraSensor.index)">
					{{ formatExtraSensorName(extraSensor.sensor, extraSensor.index) }}
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

import { getExtraColor } from "@/utils/colors";
import { displaySensorValue, formatExtraSensorName } from "@/utils/display";

defineProps<{
	sensors: Array<{ sensor: AnalogSensor; index: number }>;
}>();
</script>
