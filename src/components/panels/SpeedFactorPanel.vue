<template>
	<PanelCard icon="mdi-timer" :title="$t('panel.speedFactor.caption')">
		<template #title-append>
			<v-spacer />
			<a v-show="speedFactor !== 100 && !uiStore.uiFrozen" href="javascript:void(0)" class="text-title-small"
			   @click.prevent="machineStore.sendCode('M220 S100')">
				<v-icon size="small" class="mr-1">mdi-backup-restore</v-icon>
				{{ $t("generic.reset") }}
			</a>
		</template>

		<v-card-text class="pt-0 pb-2">
			<PercentageInput v-model="speedFactor" :min="speedFactorMin" :max="speedFactorMax"
							 :step="settings.stepWidth" :numeric-input="settings.numericInput"
							 :lockable="settings.enableLock" :disabled="uiStore.uiFrozen" />
		</v-card-text>

		<template #settings>
			<v-switch v-model="settings.numericInput" color="primary"
					  :label="$t('panel.speedFactor.settings.numericInput')"
					  v-hint="$t('panel.speedFactor.settings.numericInputHint')"
					  density="comfortable" hide-details />
			<v-switch v-model="settings.enableLock" color="primary"
					  :label="$t('panel.speedFactor.settings.enableLock')"
					  v-hint="$t('panel.speedFactor.settings.enableLockHint')"
					  density="comfortable" hide-details />

			<v-number-input v-model="settings.upperLimit" :min="100" :step="10" :precision="0" class="mt-3"
							:label="$t('panel.speedFactor.settings.upperLimit')"
							v-hint="$t('panel.speedFactor.settings.upperLimitHint')"
							variant="outlined" density="comfortable" hide-details />
			<v-number-input v-model="settings.stepWidth" :min="1" :step="1" :precision="0" class="mt-3"
							:label="$t('panel.speedFactor.settings.stepWidth')"
							v-hint="$t('panel.speedFactor.settings.stepWidthHint')"
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

const settings = useComponentSettings<{
	upperLimit: number;
	stepWidth: number;
	numericInput: boolean;
	enableLock: boolean;
}>({
	upperLimit: 150,
	stepWidth: 5,
	numericInput: false,
	enableLock: false,
});

const speedFactor = computed<number>({
	get: () => machineStore.model.move.speedFactor !== null ? machineStore.model.move.speedFactor * 100 : 100,
	set: (value) => { machineStore.sendCode(`M220 S${value}`); },
});

const speedFactorMin = computed(() => Math.max(1, Math.min(100, speedFactor.value - 50)));
// Always keep at least 50 % of headroom above the current factor so it can still be nudged up
const speedFactorMax = computed(() => Math.max(settings.value.upperLimit, speedFactor.value + 50));
</script>
