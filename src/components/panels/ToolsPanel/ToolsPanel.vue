<template>
	<PanelCard v-model:active-title="activeTab" :titles="titles">
		<v-card-text class="pa-0">
			<ControlList v-if="activeTab === 0" :sensors="settings.showExtraOnTools ? extraOnToolsSensors : []" />
			<ExtraSensorList v-else :sensors="extraTabSensors" />
		</v-card-text>

		<template #title-append>
			<v-btn v-if="settings.showTurnEverythingOff && anythingOn && canTurnEverythingOff" variant="text" size="small"
				   density="comfortable" color="primary"
				   :loading="turningEverythingOff" :title="$t('panel.tools.turnEverythingOff')"
				   @click="turnEverythingOff">
				<v-icon size="small" class="mr-1">mdi-power-standby</v-icon>
				{{ $t("panel.tools.off") }}
			</v-btn>
		</template>

		<!-- Tools / Filaments / Beds / Chambers settings -->
		<template #settings-0>
			<v-switch v-if="extraSensors.length > 0" v-model="settings.showExtraOnTools" color="primary"
					  :label="$t('panel.tools.showExtraOnTools')"
					  v-hint="$t('panel.tools.showExtraOnToolsHint')" density="comfortable" hide-details />
			<v-switch v-model="settings.showTurnEverythingOff" color="primary" class="mb-2"
					  :label="$t('panel.tools.showTurnEverythingOff')"
					  v-hint="$t('panel.tools.showTurnEverythingOffHint')" density="comfortable" hide-details />

			<v-tabs v-model="settingsTab" density="compact" grow>
				<v-tab v-if="hasTools" :value="0">{{ $t("panel.tools.caption") }}</v-tab>
				<v-tab v-if="hasTools" :value="3">{{ $t("panel.tools.filaments") }}</v-tab>
				<v-tab v-if="hasBeds" :value="1">{{ $t("panel.tools.beds") }}</v-tab>
				<v-tab v-if="hasChambers" :value="2">{{ $t("panel.tools.chambers") }}</v-tab>
				<v-tab v-if="canConfigureExtraOnTools" :value="4">{{ $t("panel.tools.extra.caption") }}</v-tab>
			</v-tabs>
			<v-window v-model="settingsTab" class="mt-3 px-3">
				<v-window-item v-if="hasTools" :value="0">
					<EntityVisibilityList kind="tools" :label="$t('panel.tools.displayedTools')"
										  v-model="settings.displayedTools" class="mt-3" />

					<v-autocomplete v-model="settings.toolChangeMacros" :items="toolChangeMacroOptions"
									:label="$t('panel.tools.toolChangeMacros')"
									v-hint="$t('panel.tools.toolChangeMacrosHint')"
									variant="outlined" density="comfortable" hide-details
									chips closable-chips clearable multiple class="mt-3" />

					<v-switch v-model="settings.groupTools" color="primary" class="mt-1"
							  :label="$t('settings.display.groupTools')" v-hint="$t('settings.display.groupToolsHint')"
							  density="comfortable" hide-details />
					<v-switch v-model="settings.groupByExtruders" color="primary"
							  :label="$t('settings.display.groupByExtruders')" v-hint="$t('settings.display.groupByExtrudersHint')"
							  density="comfortable" hide-details />
					<v-switch v-model="settings.groupByHeaters" color="primary"
							  :label="$t('settings.display.groupByHeaters')" v-hint="$t('settings.display.groupByHeatersHint')"
							  density="comfortable" hide-details />
					<v-switch v-model="settings.groupByOffsets" color="primary"
							  :label="$t('settings.display.groupByOffsets')" v-hint="$t('settings.display.groupByOffsetsHint')"
							  density="comfortable" hide-details />
					<v-switch v-model="settings.groupBySpindle" color="primary"
							  :label="$t('settings.display.groupBySpindle')" v-hint="$t('settings.display.groupBySpindleHint')"
							  density="comfortable" hide-details />

					<v-divider class="my-1" />

					<v-switch v-model="settings.showToolNumber" color="primary"
							  :label="$t('panel.tools.showToolNumber')"
							  v-hint="$t('panel.tools.showToolNumberHint')"
							  density="comfortable" hide-details />
					<v-switch v-model="settings.showActiveTemperatures" color="primary"
							  :label="$t('panel.tools.showActiveTemperatures')"
							  v-hint="$t('panel.tools.showActiveTemperaturesHint')"
							  density="comfortable" hide-details />
					<v-switch v-model="settings.showStandbyTemperatures" color="primary"
							  :label="$t('panel.tools.showStandbyTemperatures')"
							  v-hint="$t('panel.tools.showStandbyTemperaturesHint')"
							  density="comfortable" hide-details />
				</v-window-item>
				<v-window-item v-if="hasTools" :value="3">
					<v-switch v-model="settings.showFilamentControls" color="primary"
							  :label="$t('panel.tools.showFilamentControls')"
							  v-hint="$t('panel.tools.showFilamentControlsHint')"
							  density="comfortable" hide-details />
					<v-switch v-model="settings.promptDuringFilamentChange" color="primary"
							  :label="$t('panel.tools.promptDuringFilamentChange')"
							  v-hint="$t('panel.tools.promptDuringFilamentChangeHint')"
							  density="comfortable" hide-details />
				</v-window-item>
				<v-window-item v-if="hasBeds" :value="1">
					<EntityVisibilityList kind="beds" :label="$t('panel.tools.displayedBeds')"
										  v-model="settings.displayedBeds" class="mt-3" />

					<v-switch v-model="settings.singleBedControl" color="primary" class="mt-1"
							  :label="$t('settings.display.singleBedControl')" v-hint="$t('settings.display.singleBedControlHint')"
							  density="comfortable" hide-details />
				</v-window-item>
				<v-window-item v-if="hasChambers" :value="2">
					<EntityVisibilityList kind="chambers" :label="$t('panel.tools.displayedChambers')"
										  v-model="settings.displayedChambers" class="mt-3" />

					<v-switch v-model="settings.singleChamberControl" color="primary" class="mt-1"
							  :label="$t('settings.display.singleChamberControl')" v-hint="$t('settings.display.singleChamberControlHint')"
							  density="comfortable" hide-details />
				</v-window-item>
				<v-window-item v-if="canConfigureExtraOnTools" :value="4">
					<v-autocomplete v-model="checkedExtraOnTools" :items="extraSensorItems" item-value="value"
									item-title="title" :label="$t('panel.tools.extra.displayedSensors')"
									v-hint="$t('panel.tools.extra.displayedSensorsHint')" variant="outlined"
									density="comfortable" hide-details chips closable-chips clearable multiple
									class="mt-3" />
				</v-window-item>
			</v-window>
		</template>

		<!-- Extra sensors settings -->
		<template #settings-1>
			<v-autocomplete v-model="checkedExtraSensors" :items="extraSensorItems" item-value="value"
							item-title="title" :label="$t('panel.tools.extra.displayedSensors')"
							v-hint="$t('panel.tools.extra.displayedSensorsHint')" variant="outlined"
							density="comfortable" hide-details chips closable-chips clearable multiple class="mt-3" />
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import { type AnalogSensor, HeaterState, MachineStatus, SpindleState } from "@duet3d/objectmodel";

import ControlList from "./ControlList/ControlList.vue";
import ExtraSensorList from "./ExtraSensorList.vue";
import { TOOL_DISPLAY_SETTINGS_KEY, toolDisplayDefaults, type ToolDisplaySettings } from "./toolSettings";
import { useComponentSettings } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { ToolChangeMacro } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import { formatExtraSensorName } from "@/utils/display";

// tfree.g / tpre.g / tpost.g entries offered by the tool-change-macros selector
const toolChangeMacroOptions = [
	{ title: "tfree.g", value: ToolChangeMacro.free },
	{ title: "tpre.g", value: ToolChangeMacro.pre },
	{ title: "tpost.g", value: ToolChangeMacro.post }
];

interface ExtraSensor {
	sensor: AnalogSensor;
	index: number;
}

const machineStore = useMachineStore();
const uiStore = useUiStore();

// Per-panel tool display preferences, shared down to the control rows that consume them
const settings = useComponentSettings<ToolDisplaySettings>({ ...toolDisplayDefaults });
provide(TOOL_DISPLAY_SETTINGS_KEY, settings);

const extraSensors = computed<Array<ExtraSensor>>(() => {
	const heaters = machineStore.model.heat.heaters;
	return machineStore.model.sensors.analog
		.map((sensor, index) => ({ sensor, index }))
		.filter(({ sensor, index }) => sensor !== null && !heaters.some(heater => heater !== null && heater.sensor === index)) as Array<ExtraSensor>;
});

const extraSensorItems = computed(() =>
	extraSensors.value.map(({ sensor, index }) => ({ value: index, title: formatExtraSensorName(sensor, index) })));

// The Extra tab honours its own visibility list; the Tools view honours displayedExtraOnTools
const extraTabSensors = computed(() => {
	const displayed = settings.value.displayedExtraSensors;
	return extraSensors.value.filter(({ index }) => displayed === null || displayed.includes(index));
});

const extraOnToolsSensors = computed(() => {
	const displayed = settings.value.displayedExtraOnTools;
	return extraSensors.value.filter(({ index }) => displayed === null || displayed.includes(index));
});

// Both selectors materialise the explicit index list from the `null` (show-all) overlay on first edit
const checkedExtraSensors = computed<Array<number>>({
	get: () => settings.value.displayedExtraSensors ?? extraSensors.value.map(({ index }) => index),
	set: (value) => { settings.value.displayedExtraSensors = value; }
});

const checkedExtraOnTools = computed<Array<number>>({
	get: () => settings.value.displayedExtraOnTools ?? extraSensors.value.map(({ index }) => index),
	set: (value) => { settings.value.displayedExtraOnTools = value; }
});

// A bed/chamber slot counts only when one of its mapped heaters is present; firmware pads the
// mapping with empty slots that must not be treated as real beds/chambers
function slotHasHeater(heaterIndices: Array<number>): boolean {
	return heaterIndices.some(heaterIndex =>
		heaterIndex >= 0
		&& heaterIndex < machineStore.model.heat.heaters.length
		&& machineStore.model.heat.heaters[heaterIndex] !== null);
}

const hasTools = computed(() => machineStore.model.tools.some(tool => tool !== null));
const hasBeds = computed(() => machineStore.bedHeaterMapping.some(slotHasHeater));
const hasChambers = computed(() => machineStore.chamberHeaterMapping.some(slotHasHeater));

// Only active/standby mean the heater is commanded on - fault, offline and tuning are states the
// Off button cannot clear, so they must not make it appear
function heaterIsOn(heaterIndex: number): boolean {
	const heaters = machineStore.model.heat.heaters;
	return heaterIndex >= 0 && heaterIndex < heaters.length && heaters[heaterIndex] !== null
		&& [HeaterState.active, HeaterState.standby].includes(heaters[heaterIndex]!.state);
}

function spindleIsOn(spindleIndex: number): boolean {
	const spindle = machineStore.model.spindles[spindleIndex];
	return spindle !== null && (spindle.state === SpindleState.forward || spindle.state === SpindleState.reverse);
}

const anythingOn = computed(() =>
	machineStore.model.tools.some(tool => tool !== null && tool.heaters.some(heaterIsOn))
	|| machineStore.bedHeaterMapping.some(heaterIndices => heaterIndices.some(heaterIsOn))
	|| machineStore.chamberHeaterMapping.some(heaterIndices => heaterIndices.some(heaterIsOn))
	|| machineStore.model.spindles.some((_, index) => spindleIsOn(index)));

const canTurnEverythingOff = computed(() =>
	!uiStore.uiFrozen && ![MachineStatus.pausing, MachineStatus.processing, MachineStatus.resuming].includes(machineStore.model.state.status));

const turningEverythingOff = ref(false);

async function turnEverythingOff() {
	let code = "";
	for (const tool of machineStore.model.tools) {
		if (tool !== null && tool.heaters.length > 0) {
			code += `M568 P${tool.number} A0\n`;
		}
	}
	machineStore.bedHeaterMapping.forEach((heaterIndices, index) => {
		if (slotHasHeater(heaterIndices)) {
			code += `M140 P${index} S-273.15\n`;
		}
	});
	machineStore.chamberHeaterMapping.forEach((heaterIndices, index) => {
		if (slotHasHeater(heaterIndices)) {
			code += `M141 P${index} S-273.15\n`;
		}
	});
	machineStore.model.spindles.forEach((_, index) => {
		if (spindleIsOn(index)) {
			code += `M5 P${index}\n`;
		}
	});

	turningEverythingOff.value = true;
	try {
		await machineStore.sendCode(code);
	} catch {
		// handled before we get here
	}
	turningEverythingOff.value = false;
}

// Tools is always present; Extra is offered only when there are non-heater analog sensors and the
// user hasn't folded them into the Tools view
const showExtraTab = computed(() => extraSensors.value.length > 0 && !settings.value.showExtraOnTools);

// While the sensors are folded into the Tools view, their visibility list gets its own settings sub-tab
const canConfigureExtraOnTools = computed(() => extraSensors.value.length > 0 && settings.value.showExtraOnTools);

const titles = computed(() => {
	const list = [{ icon: "mdi-wrench", title: i18n.global.t("panel.tools.caption") }];
	if (showExtraTab.value) {
		list.push({ icon: "mdi-plus", title: i18n.global.t("panel.tools.extra.caption") });
	}
	return list;
});

// Falls back to the Tools view automatically once the Extra tab is no longer offered
const selectedTab = ref(0);
const activeTab = computed<number>({
	get: () => (selectedTab.value === 1 && showExtraTab.value) ? 1 : 0,
	set: (value) => { selectedTab.value = value; }
});

// Settings tabs are offered only for categories the machine actually has
const availableSettingsTabs = computed<Array<number>>(() => {
	const tabs: Array<number> = [];
	if (hasTools.value) {
		tabs.push(0, 3);
	}
	if (hasBeds.value) {
		tabs.push(1);
	}
	if (hasChambers.value) {
		tabs.push(2);
	}
	if (canConfigureExtraOnTools.value) {
		tabs.push(4);
	}
	return tabs;
});

// Keep the active settings tab pinned to a tab that is actually offered
const rawSettingsTab = ref(0);
const settingsTab = computed<number>({
	get: () => availableSettingsTabs.value.includes(rawSettingsTab.value)
		? rawSettingsTab.value
		: (availableSettingsTabs.value[0] ?? 0),
	set: (value) => { rawSettingsTab.value = value; }
});
</script>
