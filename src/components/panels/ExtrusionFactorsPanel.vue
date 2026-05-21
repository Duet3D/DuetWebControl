<template>
	<PanelCard icon="mdi-texture" :title="$t('panel.extrusionFactors.caption')">
		<v-card-text v-if="hasVisibleExtruders" class="d-flex flex-column pb-0">
			<template v-for="(extruder, index) in extruders" :key="index">
				<div v-if="displayedExtruders.includes(index)" class="d-flex flex-column pt-2">
					<div class="d-inline-flex">
						{{ $t("panel.extrusionFactors.extruder", [index]) }}
						<v-spacer />
						<a v-show="extruder.factor !== 1" href="javascript:void(0)" class="text-title-small"
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

		<template #settings>
			<EntityVisibilityList kind="extruders" :label="$t('panel.extrusionFactors.displayedExtruders')"
								  v-model="settings.displayedExtruders" />
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import PercentageInput from "@/components/inputs/PercentageInput.vue";
import { useComponentSettings } from "@/composables/useComponentSettings";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const uiStore = useUiStore();

// Per-instance extruder-visibility overlay; `null` shows every extruder
const settings = useComponentSettings<{ displayedExtruders: Array<number> | null }>({
	displayedExtruders: null,
});

const extruders = computed(() => machineStore.model.move.extruders);

const displayedExtruders = computed<Array<number>>(() =>
	settings.value.displayedExtruders ?? extruders.value.map((_, index) => index));

const hasVisibleExtruders = computed(() => extruders.value.some((_, index) => displayedExtruders.value.includes(index)));

function getMax(factor: number) {
	return Math.max(150, factor * 100 + 50);
}

function setExtrusionFactor(extruderIndex: number, value: number) {
	machineStore.sendCode(`M221 D${extruderIndex} S${value}`);
}
</script>
