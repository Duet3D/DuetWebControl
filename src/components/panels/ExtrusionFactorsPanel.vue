<template>
	<PanelCard icon="mdi-texture" :title="$t('panel.extrusionFactors.caption')">
		<template v-if="singleExtruder" #title-append>
			<v-spacer />
			<a v-show="settings.showResetLink && singleExtruderNeedsReset && !uiStore.uiFrozen"
			   href="javascript:void(0)" class="text-title-small"
			   @click.prevent="setExtrusionFactor(visibleExtruderIndices[0], 100)">
				<v-icon size="small" class="mr-1">mdi-backup-restore</v-icon>
				{{ $t("generic.reset") }}
			</a>
		</template>

		<v-card-text v-if="hasVisibleExtruders" class="d-flex flex-column pb-2">
			<template v-for="(extruder, index) in extruders" :key="index">
				<div v-if="displayedExtruders.includes(index)" class="d-flex flex-column pt-2">
					<div v-if="!singleExtruder" class="d-inline-flex mb-1">
						{{ $t("panel.extrusionFactors.extruder", [index]) }}
						<v-spacer />
						<a v-show="settings.showResetLink && extruder.factor !== 1" href="javascript:void(0)"
						   class="text-title-small" :disabled="uiStore.uiFrozen"
						   @click.prevent="setExtrusionFactor(index, 100)">
							<v-icon size="small" class="mr-1">mdi-backup-restore</v-icon>
							{{ $t("generic.reset") }}
						</a>
					</div>
					<PercentageInput :model-value="Math.round(extruder.factor * 100)" :min="0"
									 :max="getMax(extruder.factor)" :step="settings.stepWidth"
									 :disabled="uiStore.uiFrozen"
									 @update:model-value="setExtrusionFactor(index, $event)" />
				</div>
			</template>
		</v-card-text>

		<v-alert v-else-if="settings.showCurrentToolOnly" type="info" class="mb-0">
			{{ $t("panel.extrusionFactors.noExtruderSelected") }}
		</v-alert>
		<v-alert v-else type="info" class="mb-0">
			{{ $t("panel.extrusionFactors.noExtruders") }}
		</v-alert>

		<template #settings>
			<v-switch v-model="settings.showCurrentToolOnly" color="primary"
					  :label="$t('panel.extrusionFactors.settings.showCurrentToolOnly')"
					  v-hint="$t('panel.extrusionFactors.settings.showCurrentToolOnlyHint')"
					  density="comfortable" hide-details />
			<EntityVisibilityList v-if="!settings.showCurrentToolOnly" kind="extruders"
								  :label="$t('panel.extrusionFactors.displayedExtruders')"
								  v-model="settings.displayedExtruders" />

			<v-switch v-model="settings.showResetLink" color="primary" class="mt-3"
					  :label="$t('panel.extrusionFactors.settings.showResetLink')"
					  v-hint="$t('panel.extrusionFactors.settings.showResetLinkHint')"
					  density="comfortable" hide-details />

			<v-number-input v-model="settings.stepWidth" :min="1" :step="1" :precision="0" class="mt-3"
							:label="$t('panel.extrusionFactors.settings.stepWidth')"
							v-hint="$t('panel.extrusionFactors.settings.stepWidthHint')"
							variant="outlined" density="comfortable" hide-details suffix="%" />
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
const settings = useComponentSettings<{
	displayedExtruders: Array<number> | null;
	stepWidth: number;
	showResetLink: boolean;
	showCurrentToolOnly: boolean;
}>({
	displayedExtruders: null,
	stepWidth: 1,
	showResetLink: true,
	showCurrentToolOnly: false,
});

const extruders = computed(() => machineStore.model.move.extruders);

// With `showCurrentToolOnly` the visible set follows the active tool's extruders; otherwise it
// follows the manual EntityVisibilityList overlay (`null` shows every extruder)
const displayedExtruders = computed<Array<number>>(() => {
	if (settings.value.showCurrentToolOnly) {
		return machineStore.currentTool?.extruders ?? [];
	}
	return settings.value.displayedExtruders ?? extruders.value.map((_, index) => index);
});

const visibleExtruderIndices = computed(() =>
	extruders.value.map((_, index) => index).filter((index) => displayedExtruders.value.includes(index)));

const hasVisibleExtruders = computed(() => visibleExtruderIndices.value.length > 0);

// A lone extruder drops its "Extruder N" caption and moves the reset link up into the panel
// header so the panel stays compact when there is nothing to disambiguate
const singleExtruder = computed(() => visibleExtruderIndices.value.length === 1);

const singleExtruderNeedsReset = computed(() => singleExtruder.value
	&& extruders.value[visibleExtruderIndices.value[0]].factor !== 1);

function getMax(factor: number) {
	return Math.max(150, factor * 100 + 50);
}

function setExtrusionFactor(extruderIndex: number, value: number) {
	machineStore.sendCode(`M221 D${extruderIndex} S${value}`);
}
</script>
