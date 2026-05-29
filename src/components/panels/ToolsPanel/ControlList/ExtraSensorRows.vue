<template>
	<tbody>
		<tr v-for="item in sensors" :key="`extra-${item.index}`">
			<th class="pl-2 py-2" colspan="2" :class="getExtraColor(item.index)">
				{{ formatExtraSensorName(item.sensor, item.index) }}
			</th>
			<td class="py-2">
				{{ displaySensorValue(item.sensor) }}
			</td>
		</tr>
	</tbody>
</template>

<script setup lang="ts">
import type { AnalogSensor } from "@duet3d/objectmodel";

import { getExtraColor } from "@/utils/colors";
import { displaySensorValue, formatExtraSensorName } from "@/utils/display";

defineProps<{
	sensors: Array<{ sensor: AnalogSensor; index: number }>;
}>();
</script>
