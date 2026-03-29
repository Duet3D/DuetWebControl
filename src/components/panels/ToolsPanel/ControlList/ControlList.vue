<!-- Aggregates ToolRows + HeaterRows (beds, chambers) into a single five-column table.
	 Hosts the shared ResetHeaterFaultDialog instance so child rows can raise a single confirmation flow -->
<template>
	<table v-if="hasTools || hasBeds || hasChambers" class="tools">
		<colgroup>
			<col style="width: 25%">
			<col style="width: 20%">
			<col style="width: 19%">
			<col style="width: 18%">
			<col style="width: 18%">
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
				<th class="px-1">
					{{ $t("panel.tools.active") }}
				</th>
				<th class="pr-2">
					{{ $t("panel.tools.standby") }}
				</th>
			</tr>
		</thead>

		<ToolRows @resetHeaterFault="resetHeaterFault" />

		<tbody v-if="hasTools && hasBeds">
			<tr>
				<td colspan="5">
					<v-divider />
				</td>
			</tr>
		</tbody>

		<HeaterRows type="bed" @resetHeaterFault="resetHeaterFault" />

		<tbody v-if="(hasTools || hasBeds) && hasChambers">
			<tr>
				<td colspan="5">
					<v-divider />
				</td>
			</tr>
		</tbody>

		<HeaterRows type="chamber" @resetHeaterFault="resetHeaterFault" />
	</table>
	<v-alert v-else type="info" class="mb-0">
		{{ $t("panel.tools.noTools") }}
	</v-alert>

	<ResetHeaterFaultDialog v-model:shown="resettingHeaterFault" :heater="faultyHeaterToReset" />
</template>

<style scoped>
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
</style>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";

const machineStore = useMachineStore();

const hasTools = computed(() => machineStore.model.tools.some(tool => tool !== null));
const hasBeds = computed(() => machineStore.model.heat.bedHeaterMapping.some(heaterIndices =>
	heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length && machineStore.model.heat.heaters[heaterIndex] !== null)));
const hasChambers = computed(() => machineStore.model.heat.chamberHeaterMapping.some(heaterIndices =>
	heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length && machineStore.model.heat.heaters[heaterIndex] !== null)));

const resettingHeaterFault = ref(false);
const faultyHeaterToReset = ref(-1);

function resetHeaterFault(heater: number) {
	faultyHeaterToReset.value = heater;
	resettingHeaterFault.value = true;
}
</script>
