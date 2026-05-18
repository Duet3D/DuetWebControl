<template>
	<v-menu v-if="hasAnyHeater" v-model="dropdownShown" location="bottom end" :close-on-content-click="false">
		<template #activator="{ props }">
			<a v-bind="props" href="javascript:void(0)">
				<v-icon size="small">mdi-menu-down</v-icon>
				{{ $t("panel.tools.controlHeaters") }}
			</a>
		</template>

		<v-card>
			<v-layout class="d-flex flex-column justify-center pt-2 pb-3 px-2" style="min-width: 240px">
				<v-btn block color="primary" class="mb-3 pa-2" :disabled="!canTurnEverythingOff || turningEverythingOff"
					   :loading="turningEverythingOff" @click="turnEverythingOff">
					<v-icon class="mr-1">mdi-power-standby</v-icon>
					{{ $t("panel.tools.turnEverythingOff") }}
				</v-btn>

				<v-divider class="mb-2" />

				<div class="text-body-small text-medium-emphasis mt-1">
					{{ $t("panel.tools.setActiveTemperatures") }}
				</div>
				<ControlInput type="all" :control-tools="controlTools" :control-beds="controlBeds"
							  :control-chambers="controlChambers" active />

				<div class="text-body-small text-medium-emphasis mt-2">
					{{ $t("panel.tools.setStandbyTemperatures") }}
				</div>
				<ControlInput type="all" :control-tools="controlTools" :control-beds="controlBeds"
							  :control-chambers="controlChambers" standby />

				<v-divider class="mt-3 mb-1" />

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
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const uiStore = useUiStore();

const dropdownShown = ref(false);

const canTurnEverythingOff = computed(() => {
	if (uiStore.uiFrozen) {
		return false;
	}
	const heaters = machineStore.model.heat.heaters;
	const tools = machineStore.model.tools;
	// Use the store getters - they fall back to the legacy flat `bedHeaters` / `chamberHeaters`
	// arrays when the firmware doesn't emit the newer `bedHeaterMapping` / `chamberHeaterMapping`
	// fields (RRF reports the deprecated flat form on at least some boards / firmware versions)
	const bedHeaterMapping = machineStore.bedHeaterMapping;
	const chamberHeaterMapping = machineStore.chamberHeaterMapping;
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
	machineStore.bedHeaterMapping.forEach((heaterIndices, index) => {
		if (heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length)) {
			code += `M140 P${index} S-273.15\n`;
		}
	});
	machineStore.chamberHeaterMapping.forEach((heaterIndices, index) => {
		if (heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length)) {
			code += `M141 P${index} S-273.15\n`;
		}
	});

	turningEverythingOff.value = true;
	try {
		await machineStore.sendCode(code);
	} catch (e) {
		if (!(e instanceof DisconnectedError)) {
			uiStore.notifyError(e, i18n.global.t("error.turnOffEverythingFailed"));
		}
	}
	turningEverythingOff.value = false;
}

const hasTools = computed(() => machineStore.model.tools.some(tool => tool !== null));
const controlTools = ref(true);

// Use the store getters here too so we pick up beds/chambers reported via the legacy flat
// `bedHeaters` / `chamberHeaters` arrays
const hasBeds = computed(() => machineStore.bedHeaterMapping.some(heaterIndices =>
	heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length &&
		machineStore.model.heat.heaters[heaterIndex] !== null)));
const controlBeds = ref(false);

const hasChambers = computed(() => machineStore.chamberHeaterMapping.some(heaterIndices =>
	heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length &&
		machineStore.model.heat.heaters[heaterIndex] !== null)));
const controlChambers = ref(false);

// Hide the entire dropdown when the printer has no heaters of any kind - the menu would only
// contain disabled controls in that case, which reads as broken
const hasAnyHeater = computed(() => hasTools.value || hasBeds.value || hasChambers.value);
</script>
