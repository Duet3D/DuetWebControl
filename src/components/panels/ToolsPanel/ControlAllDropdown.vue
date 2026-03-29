<!-- "Control Heaters" dropdown menu in the ToolsPanel header.
	 Allows turning everything off in one click, and bulk-setting active/standby temperatures across
	 selected groups (tools, beds, chambers) via a single ControlInput for each -->
<template>
	<v-menu v-model="dropdownShown" location="bottom end" :close-on-content-click="false">
		<template #activator="{ props }">
			<a v-bind="props" href="javascript:void(0)">
				<v-icon size="small">mdi-menu-down</v-icon>
				{{ $t("panel.tools.controlHeaters") }}
			</a>
		</template>

		<v-card>
			<v-layout class="d-flex flex-column justify-center pt-2 pb-3 px-2">
				<v-btn block color="primary" class="mb-3 pa-2" :disabled="!canTurnEverythingOff || turningEverythingOff"
					   :loading="turningEverythingOff" @click="turnEverythingOff">
					<v-icon class="mr-1">mdi-power-standby</v-icon>
					{{ $t("panel.tools.turnEverythingOff") }}
				</v-btn>

				<v-divider class="mb-2" />

				<ControlInput :label="$t('panel.tools.setActiveTemperatures')" type="all"
							  :control-tools="controlTools" :control-beds="controlBeds"
							  :control-chambers="controlChambers" active />
				<ControlInput :label="$t('panel.tools.setStandbyTemperatures')" type="all"
							  :control-tools="controlTools" :control-beds="controlBeds"
							  :control-chambers="controlChambers" standby />

				<v-switch v-show="hasTools" v-model="controlTools" hide-details density="compact" class="mx-1 mt-0"
						  :label="$t('panel.tools.setToolTemperatures')" />
				<v-switch v-show="hasBeds" v-model="controlBeds" hide-details density="compact" class="mx-1"
						  :label="$t('panel.tools.setBedTemperatures')" />
				<v-switch v-show="hasChambers" v-model="controlChambers" hide-details density="compact" class="mx-1"
						  :label="$t('panel.tools.setChamberTemperatures')" />
			</v-layout>
		</v-card>
	</v-menu>
</template>

<script setup lang="ts">
import { HeaterState } from "@duet3d/objectmodel";
import { DisconnectedError } from "@duet3d/connectors";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore, LogLevel } from "@/stores/ui";
import { getErrorMessage } from "@/utils/errors";

const machineStore = useMachineStore();
const uiStore = useUiStore();

const dropdownShown = ref(false);

const canTurnEverythingOff = computed(() => {
	if (uiStore.uiFrozen) {
		return false;
	}
	const heaters = machineStore.model.heat.heaters;
	const tools = machineStore.model.tools;
	const bedHeaterMapping = machineStore.model.heat.bedHeaterMapping;
	const chamberHeaterMapping = machineStore.model.heat.chamberHeaterMapping;
	return tools.some(tool => tool !== null &&
		tool.heaters.some(toolHeater => toolHeater >= 0 && toolHeater < heaters.length &&
			heaters[toolHeater] !== null && heaters[toolHeater]!.state !== HeaterState.off))
		|| bedHeaterMapping.some(heaterIndices => heaterIndices.some(bedHeater => bedHeater >= 0 && bedHeater < heaters.length &&
			heaters[bedHeater] !== null && heaters[bedHeater]!.state !== HeaterState.off))
		|| chamberHeaterMapping.some(heaterIndices => heaterIndices.some(chamberHeater => chamberHeater >= 0 && chamberHeater < heaters.length &&
			heaters[chamberHeater] !== null && heaters[chamberHeater]!.state !== HeaterState.off));
});

const turningEverythingOff = ref(false);
async function turnEverythingOff() {
	let code = "";
	for (const tool of machineStore.model.tools) {
		if (tool !== null && tool.heaters.length > 0) {
			code += `M568 P${tool.number} A0\n`;
		}
	}
	machineStore.model.heat.bedHeaterMapping.forEach((heaterIndices, index) => {
		if (heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length)) {
			code += `M140 P${index} S-273.15\n`;
		}
	});
	machineStore.model.heat.chamberHeaterMapping.forEach((heaterIndices, index) => {
		if (heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length)) {
			code += `M141 P${index} S-273.15\n`;
		}
	});

	turningEverythingOff.value = true;
	try {
		await machineStore.sendCode(code);
	} catch (e) {
		if (!(e instanceof DisconnectedError)) {
			uiStore.log(LogLevel.error, i18n.global.t("error.turnOffEverythingFailed"), getErrorMessage(e));
		}
	}
	turningEverythingOff.value = false;
}

const hasTools = computed(() => machineStore.model.tools.some(tool => tool !== null));
const controlTools = ref(true);

const hasBeds = computed(() => machineStore.model.heat.bedHeaterMapping.some(heaterIndices =>
	heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length &&
		machineStore.model.heat.heaters[heaterIndex] !== null)));
const controlBeds = ref(false);

const hasChambers = computed(() => machineStore.model.heat.chamberHeaterMapping.some(heaterIndices =>
	heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length &&
		machineStore.model.heat.heaters[heaterIndex] !== null)));
const controlChambers = ref(false);
</script>
