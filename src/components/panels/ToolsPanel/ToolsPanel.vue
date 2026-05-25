<template>
	<PanelCard v-model:active-title="activeTab" :titles="titles">
		<v-card-text class="pa-0">
			<ControlList v-if="activeTab === 0" />
			<ExtraSensorList v-else :sensors="extraSensors" />
		</v-card-text>

		<!-- Tools / Filaments / Beds / Chambers settings -->
		<template #settings-0>
			<v-tabs v-model="settingsTab" density="compact" grow>
				<v-tab v-if="hasTools" :value="0">{{ $t("panel.tools.caption") }}</v-tab>
				<v-tab v-if="hasTools" :value="3">{{ $t("panel.tools.filaments") }}</v-tab>
				<v-tab v-if="hasBeds" :value="1">{{ $t("panel.tools.beds") }}</v-tab>
				<v-tab v-if="hasChambers" :value="2">{{ $t("panel.tools.chambers") }}</v-tab>
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
			</v-window>
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import type { AnalogSensor } from "@duet3d/objectmodel";

import ControlList from "./ControlList/ControlList.vue";
import ExtraSensorList from "./ExtraSensorList.vue";
import { TOOL_DISPLAY_SETTINGS_KEY, toolDisplayDefaults, type ToolDisplaySettings } from "./toolSettings";
import { useComponentSettings } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { ToolChangeMacro } from "@/stores/settings";

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

// Per-panel tool display preferences, shared down to the control rows that consume them
const settings = useComponentSettings<ToolDisplaySettings>({ ...toolDisplayDefaults });
provide(TOOL_DISPLAY_SETTINGS_KEY, settings);

const extraSensors = computed<Array<ExtraSensor>>(() => {
	const heaters = machineStore.model.heat.heaters;
	return machineStore.model.sensors.analog
		.map((sensor, index) => ({ sensor, index }))
		.filter(({ sensor, index }) => sensor !== null && !heaters.some(heater => heater !== null && heater.sensor === index)) as Array<ExtraSensor>;
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

// Tools is always present; Extra is offered only when there are non-heater analog sensors
const titles = computed(() => {
	const list = [{ icon: "mdi-wrench", title: i18n.global.t("panel.tools.caption") }];
	if (extraSensors.value.length > 0) {
		list.push({ icon: "mdi-plus", title: i18n.global.t("panel.tools.extra.caption") });
	}
	return list;
});

// Falls back to the Tools view automatically once the Extra tab is no longer offered
const selectedTab = ref(0);
const activeTab = computed<number>({
	get: () => (selectedTab.value === 1 && extraSensors.value.length > 0) ? 1 : 0,
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
