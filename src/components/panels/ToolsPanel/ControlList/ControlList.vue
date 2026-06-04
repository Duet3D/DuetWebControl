<!-- Unscoped: the table rows are emitted by ToolRows / HeaterRows (child components). Vue 3
	 scoped CSS only attaches the parent's data-v hash to elements in the parent's own
	 template, so `table.tools td` under `<style scoped>` wouldn't match the child-rendered
	 cells and the centering rule would silently drop -->
<style>
table.tools {
	width: 100%;
	border-spacing: 0;
}

table.tools i {
	color: inherit !important;
}

table.tools td,
table.tools th {
	text-align: center;
}

/* Tool rows stretch vertically with their multi-line content (tool name, filament link, sub-line),
   while bed/chamber rows have only a single short label and would otherwise collapse to ~42px and
   read as visually squashed against the much taller tool row. Give the heater-row cells a
   comfortable vertical padding so the table reads as balanced */
table.tools tbody.heater-rows td,
table.tools tbody.heater-rows th {
	padding-block: 0.75rem;
}

/* Tool / heater names render as anchors for the click handlers - strip the browser default
   underline so the table reads as data, not a link list. Hover feedback is the cursor */
table.tools a {
	text-decoration: none;
}
</style>

<template>
	<table v-if="hasTools || hasBeds || hasChambers || hasExtra" class="tools">
		<colgroup>
			<col style="width: 25%">
			<col style="width: 20%">
			<col style="width: 19%">
			<col v-if="toolSettings.showActiveTemperatures" style="width: 18%">
			<col v-if="toolSettings.showStandbyTemperatures" style="width: 18%">
		</colgroup>
		<thead>
			<tr>
				<th class="pl-2">
					{{ $t("panel.tools.tool", [""]) }}
				</th>
				<th class="px-1">
					{{ $t("panel.tools.heater", [""]) }}
				</th>
				<th class="px-1">
					{{ $t("panel.tools.current", [""]) }}
				</th>
				<th v-if="toolSettings.showActiveTemperatures" class="px-1">
					{{ $t("panel.tools.active") }}
				</th>
				<th v-if="toolSettings.showStandbyTemperatures" class="pr-2">
					{{ $t("panel.tools.standby") }}
				</th>
			</tr>
		</thead>

		<ToolRows @resetHeaterFault="resetHeaterFault" />

		<tbody v-if="hasTools && hasBeds">
			<tr>
				<td :colspan="columnCount">
					<v-divider />
				</td>
			</tr>
		</tbody>

		<HeaterRows type="bed" @resetHeaterFault="resetHeaterFault" />

		<tbody v-if="(hasTools || hasBeds) && hasChambers">
			<tr>
				<td :colspan="columnCount">
					<v-divider />
				</td>
			</tr>
		</tbody>

		<HeaterRows type="chamber" @resetHeaterFault="resetHeaterFault" />

		<tbody v-if="(hasTools || hasBeds || hasChambers) && hasExtra">
			<tr>
				<td :colspan="columnCount">
					<v-divider />
				</td>
			</tr>
		</tbody>

		<ExtraSensorRows :sensors="sensors" />
	</table>
	<v-alert v-else type="info" class="mb-0">
		{{ $t("panel.tools.noTools") }}
	</v-alert>

	<ResetHeaterFaultDialog v-model:shown="resettingHeaterFault" :heater="faultyHeaterToReset" />
</template>

<script setup lang="ts">
import type { AnalogSensor } from "@duet3d/objectmodel";

import { TOOL_DISPLAY_SETTINGS_KEY } from "../toolSettings";
import { useMachineStore } from "@/stores/machine";

// Extra (non-heater) analog sensors to fold into the table, already filtered by the panel; empty
// unless the user enabled "show extra sensors on Tools"
const props = withDefaults(defineProps<{
	sensors?: Array<{ sensor: AnalogSensor; index: number }>;
}>(), {
	sensors: () => []
});

const machineStore = useMachineStore();

const toolSettings = inject(TOOL_DISPLAY_SETTINGS_KEY)!;

const hasExtra = computed(() => props.sensors.length > 0);

// Tool / Heater / Current are always shown; Active and Standby are optional
const columnCount = computed(() =>
	3 + (toolSettings.value.showActiveTemperatures ? 1 : 0) + (toolSettings.value.showStandbyTemperatures ? 1 : 0));

const hasTools = computed(() => machineStore.model.tools.some(tool => tool !== null));
// Use the store getters - they fall back to the deprecated `bedHeaters` / `chamberHeaters`
// flat lists so older firmware (which doesn't publish the new mapping) still surfaces the rows
const hasBeds = computed(() => machineStore.bedHeaterMapping.some(heaterIndices =>
	heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length && machineStore.model.heat.heaters[heaterIndex] !== null)));
const hasChambers = computed(() => machineStore.chamberHeaterMapping.some(heaterIndices =>
	heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length && machineStore.model.heat.heaters[heaterIndex] !== null)));

const resettingHeaterFault = ref(false);
const faultyHeaterToReset = ref(-1);

function resetHeaterFault(heater: number) {
	faultyHeaterToReset.value = heater;
	resettingHeaterFault.value = true;
}
</script>
