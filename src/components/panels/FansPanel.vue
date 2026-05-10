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
							<v-icon>{{ displayedFans.includes(-1) ? "mdi-checkbox-marked" : "mdi-checkbox-blank" }}</v-icon>
						</template>
						<v-list-item-title>{{ $t("panel.fans.toolFan") }}</v-list-item-title>
					</v-list-item>
					<template v-for="(fanModel, index) in fans" :key="index">
						<v-list-item v-if="fanModel && fanModel.thermostatic.sensors.length === 0"
									 @click="toggleFanVisibility(index)">
							<template #prepend>
								<v-icon>{{ displayedFans.includes(index) ? "mdi-checkbox-marked" : "mdi-checkbox-blank" }}</v-icon>
							</template>
							<v-list-item-title>{{ fanModel.name || $t("panel.fans.fan", [index]) }}</v-list-item-title>
						</v-list-item>
					</template>
				</v-list>
			</v-menu>
		</v-card-title>

		<v-card-text v-if="hasVisibleFans" class="d-flex flex-column pb-0">
			<div v-if="displayedFans.includes(-1) && toolFanValue >= 0"
				 class="d-flex flex-column pt-2">
				{{ $t("panel.fans.toolFan") }}
				<PercentageInput :model-value="toolFanValue" :disabled="uiStore.uiFrozen"
								 @update:model-value="setFanValue(-1, $event)" />
			</div>
			<template v-for="(fanModel, index) in fans" :key="index">
				<div v-if="displayedFans.includes(index) && fanModel
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
import { useComponentSettings } from "@/composables/useComponentSettings";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

// Per-instance visibility overlay over the global default. New panels start with `null` and
// inherit settingsStore.displayedFans; once the user toggles a fan in *this* panel's menu the
// override sticks for this positional id. Once the dynamic custom layout lands and the user
// can place multiple FansPanels, each gets independent visibility without losing the app-wide
// default that drives a fresh layout
const localVisibility = useComponentSettings<{ displayedFans: Array<number> | null }>({
	displayedFans: null,
});

const displayedFans = computed<Array<number>>(() => {
	return localVisibility.value.displayedFans ?? settingsStore.displayedFans;
});

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

function toggleFanVisibility(fanIndex: number) {
	// Write to the per-instance overlay so this panel's selection diverges from the global
	// default without changing it. Start from the currently-effective list so the toggle
	// reflects what the user actually sees
	const current = displayedFans.value.slice();
	const idx = current.indexOf(fanIndex);
	if (idx === -1) {
		current.push(fanIndex);
	} else {
		current.splice(idx, 1);
	}
	localVisibility.value = { displayedFans: current };
}
</script>
