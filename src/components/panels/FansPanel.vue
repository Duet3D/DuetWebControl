<!-- Lists every visible non-thermostatic fan in its own row with a PercentageInput. The "Change visibility"
	 menu toggles which fans appear (settings.displayedFans). The tool-fan row is always indexed as -1 -->
<template>
	<v-card>
		<v-card-title class="d-flex align-center pb-0">
			<v-icon size="small" class="mr-1">mdi-fan</v-icon>
			{{ $t("panel.fans.caption") }}
			<v-spacer />
			<v-menu location="bottom end">
				<template #activator="{ props: activatorProps }">
					<a v-show="!uiStore.uiFrozen && hasControllableFans" v-bind="activatorProps"
					   href="javascript:void(0)" class="text-subtitle-2">
						{{ $t("panel.fans.changeVisibility") }}
					</a>
				</template>
				<v-list>
					<v-list-item @click="toggleFanVisibility(-1)">
						<template #prepend>
							<v-icon>{{ settingsStore.displayedFans.includes(-1) ? "mdi-checkbox-marked" : "mdi-checkbox-blank" }}</v-icon>
						</template>
						<v-list-item-title>{{ $t("panel.fans.toolFan") }}</v-list-item-title>
					</v-list-item>
					<template v-for="(fanModel, index) in fans" :key="index">
						<v-list-item v-if="fanModel && fanModel.thermostatic.sensors.length === 0"
									 @click="toggleFanVisibility(index)">
							<template #prepend>
								<v-icon>{{ settingsStore.displayedFans.includes(index) ? "mdi-checkbox-marked" : "mdi-checkbox-blank" }}</v-icon>
							</template>
							<v-list-item-title>{{ fanModel.name || $t("panel.fans.fan", [index]) }}</v-list-item-title>
						</v-list-item>
					</template>
				</v-list>
			</v-menu>
		</v-card-title>

		<v-card-text v-if="hasVisibleFans" class="d-flex flex-column pb-0">
			<div v-if="settingsStore.displayedFans.includes(-1) && toolFanValue >= 0"
				 class="d-flex flex-column pt-2">
				{{ $t("panel.fans.toolFan") }}
				<PercentageInput :model-value="toolFanValue" :disabled="uiStore.uiFrozen"
								 @update:model-value="setFanValue(-1, $event)" />
			</div>
			<template v-for="(fanModel, index) in fans" :key="index">
				<div v-if="settingsStore.displayedFans.includes(index) && fanModel
								&& fanModel.thermostatic.sensors.length === 0"
					 class="d-flex flex-column pt-2">
					{{ fanModel.name || $t("panel.fans.fan", [index]) }}
					<PercentageInput :model-value="Math.round(fanModel.requestedValue * 100)" :disabled="uiStore.uiFrozen"
									 @update:model-value="setFanValue(index, $event)" />
				</div>
			</template>
		</v-card-text>

		<v-alert v-else type="info" class="mb-0">
			{{ $t("panel.fans.noFans") }}
		</v-alert>
	</v-card>
</template>

<script setup lang="ts">
import { Fan } from "@duet3d/objectmodel";

import PercentageInput from "@/components/inputs/PercentageInput.vue";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const fans = computed<Array<Fan | null>>(() => machineStore.model.fans);
const currentTool = computed(() => machineStore.currentTool);

const toolFan = computed(() => (currentTool.value && currentTool.value.fans.length > 0) ? currentTool.value.fans[0] : -1);
const toolFanValue = computed(() => {
	const index = toolFan.value;
	if (index >= 0 && index < fans.value.length && fans.value[index] !== null) {
		return Math.round(fans.value[index]!.requestedValue * 100);
	}
	return 0;
});

const hasControllableFans = computed(() => fans.value.some(f => f !== null && f.thermostatic.sensors.length === 0));

const hasVisibleFans = computed(() => {
	// Any explicitly-displayed manual fan
	if (fans.value.some((f, index) => settingsStore.displayedFans.includes(index)
			&& f !== null && f.thermostatic.sensors.length === 0)) {
		return true;
	}
	// Or the tool fan, if visible and currently mapped to a non-thermostatic fan
	const idx = toolFan.value;
	return settingsStore.displayedFans.includes(-1) && idx >= 0 && idx < fans.value.length
		&& fans.value[idx] !== null && fans.value[idx]!.thermostatic.sensors.length === 0;
});

function setFanValue(fanIndex: number, value: number) {
	const ratio = (value / 100).toFixed(2);
	const code = (fanIndex <= -1) ? `M106 S${ratio}` : `M106 P${fanIndex} S${ratio}`;
	machineStore.sendCode(code);
}

function toggleFanVisibility(fanIndex: number) {
	settingsStore.toggleFanVisibility(fanIndex);
}
</script>
