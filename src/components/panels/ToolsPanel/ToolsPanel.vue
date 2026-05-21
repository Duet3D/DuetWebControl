<template>
	<PanelCard v-model:active-title="activeTab" :titles="titles">
		<v-card-text class="pa-0">
			<ControlList v-if="activeTab === 0" />
			<ExtraSensorList v-else :sensors="extraSensors" />
		</v-card-text>

		<!-- Tools / Beds / Chambers settings -->
		<template #settings-0>
			<v-tabs v-model="settingsTab" density="compact" grow>
				<v-tab v-if="hasTools" :value="0">{{ $t("panel.tools.caption") }}</v-tab>
				<v-tab v-if="hasBeds" :value="1">{{ $t("panel.tools.beds") }}</v-tab>
				<v-tab v-if="hasChambers" :value="2">{{ $t("panel.tools.chambers") }}</v-tab>
			</v-tabs>
			<v-window v-model="settingsTab" class="mt-3 pt-3">
				<v-window-item v-if="hasTools" :value="0">
					<EntityVisibilityList kind="tools" :label="$t('panel.tools.displayedTools')"
										  v-model="settings.displayedTools" />

					<v-switch v-model="settings.groupTools" color="primary"
							  :label="$t('settings.display.groupTools')" :title="$t('settings.display.groupToolsHint')"
							  density="comfortable" hide-details class="mt-2" />
					<v-switch v-model="settings.groupByExtruders" color="primary"
							  :label="$t('settings.display.groupByExtruders')" :title="$t('settings.display.groupByExtrudersHint')"
							  density="comfortable" hide-details class="mt-2" />
					<v-switch v-model="settings.groupByHeaters" color="primary"
							  :label="$t('settings.display.groupByHeaters')" :title="$t('settings.display.groupByHeatersHint')"
							  density="comfortable" hide-details class="mt-2" />
					<v-switch v-model="settings.groupByOffsets" color="primary"
							  :label="$t('settings.display.groupByOffsets')" :title="$t('settings.display.groupByOffsetsHint')"
							  density="comfortable" hide-details class="mt-2" />
					<v-switch v-model="settings.groupBySpindle" color="primary"
							  :label="$t('settings.display.groupBySpindle')" :title="$t('settings.display.groupBySpindleHint')"
							  density="comfortable" hide-details class="mt-2" />
					<v-switch v-model="settings.showActiveTemperatures" color="primary"
							  :label="$t('panel.tools.showActiveTemperatures')"
							  :title="$t('panel.tools.showActiveTemperaturesHint')"
							  density="comfortable" hide-details class="mt-2" />
					<v-switch v-model="settings.showStandbyTemperatures" color="primary"
							  :label="$t('panel.tools.showStandbyTemperatures')"
							  :title="$t('panel.tools.showStandbyTemperaturesHint')"
							  density="comfortable" hide-details class="mt-2" />
					<v-switch v-model="settings.showFilamentControls" color="primary"
							  :label="$t('panel.tools.showFilamentControls')"
							  :title="$t('panel.tools.showFilamentControlsHint')"
							  density="comfortable" hide-details class="mt-2" />
				</v-window-item>
				<v-window-item v-if="hasBeds" :value="1">
					<EntityVisibilityList kind="beds" :label="$t('panel.tools.displayedBeds')"
										  v-model="settings.displayedBeds" />

					<v-switch v-model="settings.singleBedControl" color="primary"
							  :label="$t('settings.display.singleBedControl')" :title="$t('settings.display.singleBedControlHint')"
							  density="comfortable" hide-details class="mt-2" />
				</v-window-item>
				<v-window-item v-if="hasChambers" :value="2">
					<EntityVisibilityList kind="chambers" :label="$t('panel.tools.displayedChambers')"
										  v-model="settings.displayedChambers" />

					<v-switch v-model="settings.singleChamberControl" color="primary"
							  :label="$t('settings.display.singleChamberControl')" :title="$t('settings.display.singleChamberControlHint')"
							  density="comfortable" hide-details class="mt-2" />
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
		tabs.push(0);
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
