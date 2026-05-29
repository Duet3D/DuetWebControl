<template>
	<tbody>
		<template v-for="(item, rowIndex) in sensors" :key="`extra-${item.index}`">
			<tr v-if="rowIndex > 0">
				<td :colspan="columnCount">
					<v-divider />
				</td>
			</tr>
			<tr>
				<th class="pl-2 py-2" colspan="2" :class="getExtraColor(item.index)">
					{{ formatExtraSensorName(item.sensor, item.index) }}
				</th>
				<td class="py-2">
					{{ displaySensorValue(item.sensor) }}
				</td>
			</tr>
		</template>
	</tbody>
</template>

<script setup lang="ts">
import type { AnalogSensor } from "@duet3d/objectmodel";

import { TOOL_DISPLAY_SETTINGS_KEY } from "../toolSettings";
import { getExtraColor } from "@/utils/colors";
import { displaySensorValue, formatExtraSensorName } from "@/utils/display";

defineProps<{
	sensors: Array<{ sensor: AnalogSensor; index: number }>;
}>();

const toolSettings = inject(TOOL_DISPLAY_SETTINGS_KEY)!;

// Mirror the column layout of the tools table so the divider spans every column
const columnCount = computed(() =>
	3 + (toolSettings.value.showActiveTemperatures ? 1 : 0) + (toolSettings.value.showStandbyTemperatures ? 1 : 0));
</script>
