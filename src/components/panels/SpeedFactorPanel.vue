<!-- Move speed factor (M220 Snnn). The slider min/max widen around the current value so the user can
	 always dial up/down by ~50 % without re-bounding -->
<template>
	<v-card>
		<v-card-title class="d-flex align-center pb-0">
			<v-icon size="small" class="mr-1">mdi-timer</v-icon>
			{{ $t("panel.speedFactor.caption") }}
			<v-spacer />
			<a v-show="speedFactor !== 100 && !uiStore.uiFrozen" href="javascript:void(0)" class="text-subtitle-2"
			   @click.prevent="machineStore.sendCode('M220 S100')">
				<v-icon size="small" class="mr-1">mdi-backup-restore</v-icon>
				{{ $t("generic.reset") }}
			</a>
		</v-card-title>

		<v-card-text class="py-0">
			<PercentageInput v-model="speedFactor" :min="speedFactorMin" :max="speedFactorMax"
							 :disabled="uiStore.uiFrozen" />
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import PercentageInput from "@/components/inputs/PercentageInput.vue";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const uiStore = useUiStore();

const speedFactor = computed<number>({
	get: () => machineStore.model.move.speedFactor !== null ? machineStore.model.move.speedFactor * 100 : 100,
	set: (value) => { machineStore.sendCode(`M220 S${value}`); },
});

const speedFactorMin = computed(() => Math.max(1, Math.min(100, speedFactor.value - 50)));
const speedFactorMax = computed(() => Math.max(150, speedFactor.value + 50));
</script>
