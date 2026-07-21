<template>
	<PanelCard icon="mdi-fan" :title="$t('panel.fans.caption')">
		<v-card-text v-if="hasVisibleFans" class="d-flex flex-column pb-2">
			<div v-if="displayedFans.includes(-1) && toolFanValue >= 0"
				 class="d-flex flex-column pt-2">
				<div class="mb-1">{{ $t("panel.fans.toolFan") }}</div>
				<PercentageInput :model-value="toolFanValue" :step="settings.stepWidth"
								 :disabled="uiStore.uiFrozen"
								 @update:model-value="setFanValue(-1, $event)" />
			</div>
			<template v-for="(fanModel, index) in fans" :key="index">
				<div v-if="displayedFans.includes(index) && fanModel
								&& fanModel.thermostatic.sensors.length === 0"
					 class="d-flex flex-column pt-2">
					<div class="mb-1">{{ fanModel.name || $t("panel.fans.fan", [index]) }}</div>
					<PercentageInput :model-value="Math.round(fanModel.requestedValue * 100)" :step="settings.stepWidth"
										 :disabled="uiStore.uiFrozen"
									 @update:model-value="setFanValue(index, $event)" />
				</div>
			</template>
		</v-card-text>

		<v-alert v-else type="info" class="mb-0">
			{{ $t("panel.fans.noFans") }}
		</v-alert>

		<template #settings>
			<EntityVisibilityList kind="fans" :label="$t('panel.fans.displayedFans')"
								  v-model="settings.displayedFans" />

			<v-number-input v-model="settings.stepWidth" :min="1" :step="1" :precision="0" class="mt-3"
							:label="$t('panel.fans.settings.stepWidth')"
							v-hint="$t('panel.fans.settings.stepWidthHint')"
							variant="outlined" density="comfortable" hide-details suffix="%" />
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import { Fan } from "@duet3d/objectmodel";

import PercentageInput from "@/components/inputs/PercentageInput.vue";
import { useComponentSettings } from "@/composables/useComponentSettings";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const uiStore = useUiStore();

// Per-instance fan-visibility overlay; `null` shows every controllable fan
const settings = useComponentSettings<{
	displayedFans: Array<number> | null;
	stepWidth: number;
}>({
	displayedFans: null,
	stepWidth: 5,
});

const fans = computed<Array<Fan | null>>(() => machineStore.model.fans);
const currentTool = computed(() => machineStore.currentTool);

// Tool fan (-1) plus every non-thermostatic fan - matches the "fans" EntityVisibilityList kind
const controllableFanIndices = computed<Array<number>>(() => {
	const list = [-1];
	fans.value.forEach((fan, index) => {
		if (fan !== null && fan.thermostatic.sensors.length === 0) {
			list.push(index);
		}
	});
	return list;
});

const displayedFans = computed<Array<number>>(() => settings.value.displayedFans ?? controllableFanIndices.value);

const toolFan = computed(() => (currentTool.value && currentTool.value.fans.length > 0) ? currentTool.value.fans[0] : -1);
const toolFanValue = computed(() => {
	const index = toolFan.value;
	if (index >= 0 && index < fans.value.length && fans.value[index] !== null) {
		return Math.round(fans.value[index]!.requestedValue * 100);
	}
	return 0;
});

const hasVisibleFans = computed(() => {
	// Any explicitly-displayed manual fan
	if (fans.value.some((f, index) => displayedFans.value.includes(index)
			&& f !== null && f.thermostatic.sensors.length === 0)) {
		return true;
	}
	// Or the tool fan, if visible and currently mapped to a non-thermostatic fan
	const idx = toolFan.value;
	return displayedFans.value.includes(-1) && idx >= 0 && idx < fans.value.length
		&& fans.value[idx] !== null && fans.value[idx]!.thermostatic.sensors.length === 0;
});

function setFanValue(fanIndex: number, value: number) {
	const ratio = (value / 100).toFixed(2);
	const code = (fanIndex <= -1) ? `M106 S${ratio}` : `M106 P${fanIndex} S${ratio}`;
	machineStore.sendCode(code);
}
</script>
