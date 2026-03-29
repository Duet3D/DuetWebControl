<!-- Per-extruder feedrate override (M221 Dnnn Snnn). The "Change Visibility" menu picks which
	 extruder rows to render; the visibility array lives in the settings store -->
<template>
	<v-card>
		<v-card-title class="d-flex align-center pb-0">
			<v-icon size="small" class="mr-1">mdi-texture</v-icon>
			{{ $t("panel.extrusionFactors.caption") }}
			<v-spacer />
			<v-menu location="bottom end">
				<template #activator="{ props: activatorProps }">
					<a v-show="!uiStore.uiFrozen && extruders.length > 0" v-bind="activatorProps"
					   href="javascript:void(0)" class="text-subtitle-2">
						{{ $t("panel.extrusionFactors.changeVisibility") }}
					</a>
				</template>
				<v-list>
					<v-list-item v-for="(_, index) in extruders" :key="index"
								 @click.stop="settingsStore.toggleExtruderVisibility(index)">
						<template #prepend>
							<v-icon>{{ settingsStore.displayedExtruders.includes(index) ? "mdi-checkbox-marked" : "mdi-checkbox-blank" }}</v-icon>
						</template>
						<v-list-item-title>{{ $t("panel.extrusionFactors.extruder", [index]) }}</v-list-item-title>
					</v-list-item>
				</v-list>
			</v-menu>
		</v-card-title>

		<v-card-text v-if="hasVisibleExtruders" class="d-flex flex-column pb-0">
			<template v-for="(extruder, index) in extruders" :key="index">
				<div v-if="settingsStore.displayedExtruders.includes(index)" class="d-flex flex-column pt-2">
					<div class="d-inline-flex">
						{{ $t("panel.extrusionFactors.extruder", [index]) }}
						<v-spacer />
						<a v-show="extruder.factor !== 1" href="javascript:void(0)" class="text-subtitle-2"
						   :disabled="uiStore.uiFrozen"
						   @click.prevent="setExtrusionFactor(index, 100)">
							<v-icon size="small" class="mr-1">mdi-backup-restore</v-icon>
							{{ $t("generic.reset") }}
						</a>
					</div>
					<PercentageInput :model-value="Math.round(extruder.factor * 100)" :min="0"
									 :max="getMax(extruder.factor)" :step="1" :disabled="uiStore.uiFrozen"
									 @update:model-value="setExtrusionFactor(index, $event)" />
				</div>
			</template>
		</v-card-text>

		<v-alert v-else type="info" class="mb-0">
			{{ $t("panel.extrusionFactors.noExtruders") }}
		</v-alert>
	</v-card>
</template>

<script setup lang="ts">
import PercentageInput from "@/components/inputs/PercentageInput.vue";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const extruders = computed(() => machineStore.model.move.extruders);
const hasVisibleExtruders = computed(() => extruders.value.some((_, index) => settingsStore.displayedExtruders.includes(index)));

function getMax(factor: number) {
	return Math.max(150, factor * 100 + 50);
}

function setExtrusionFactor(extruderIndex: number, value: number) {
	machineStore.sendCode(`M221 D${extruderIndex} S${value}`);
}
</script>
