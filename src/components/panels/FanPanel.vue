<template>
	<v-card>
		<v-card-title class="d-flex align-center pb-0">
			<v-icon size="small" class="mr-1">mdi-fan</v-icon>
			{{ $t("panel.fan.caption") }}
		</v-card-title>

		<v-card-text class="pt-0">
			<v-row align="start">
				<v-col cols="12" sm="auto" order="1" order-sm="0">
					<p class="mb-1">{{ $t("panel.fan.selection") }}</p>
					<v-btn-toggle v-model="fan" mandatory variant="outlined" color="primary" divided>
						<v-btn v-if="currentTool && currentTool.fans.length > 0" :value="-1">
							{{ $t("panel.fan.toolFan") }}
						</v-btn>
						<template v-for="(fanModel, index) in fans" :key="index">
							<v-btn v-if="fanModel && fanModel.thermostatic.sensors.length === 0" :value="index"
								   :disabled="uiStore.uiFrozen">
								{{ fanModel.name || $t("panel.fan.fan", [index]) }}
							</v-btn>
						</template>
					</v-btn-toggle>
				</v-col>

				<v-col cols="12" sm="auto" order="0" order-sm="1" class="flex-sm-grow-1">
					<PercentageInput v-model="fanValue" :max="maxFanValue" :disabled="uiStore.uiFrozen" />
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { Fan } from "@duet3d/objectmodel";

import PercentageInput from "@/components/inputs/PercentageInput.vue";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const uiStore = useUiStore();

const fan = ref(-1);

const fans = computed<Array<Fan | null>>(() => machineStore.model.fans);
const currentTool = computed(() => machineStore.currentTool);

function effectiveFanIndex(): number {
	if (fan.value === -1) {
		return (currentTool.value && currentTool.value.fans.length > 0) ? currentTool.value.fans[0] : -1;
	}
	return fan.value;
}

const fanValue = computed<number>({
	get: () => {
		const index = effectiveFanIndex();
		const fanObj = (index >= 0 && index < fans.value.length) ? fans.value[index] : null;
		return fanObj !== null ? Math.round(fanObj.requestedValue * 100) : 0;
	},
	set: (value) => {
		const clamped = Math.min(100, Math.max(0, value)) / 100;
		const code = (fan.value === -1)
			? `M106 S${clamped.toFixed(2)}`
			: `M106 P${fan.value} S${clamped.toFixed(2)}`;
		machineStore.sendCode(code);
	},
});

const maxFanValue = computed(() => {
	const index = effectiveFanIndex();
	const fanObj = (index >= 0 && index < fans.value.length) ? fans.value[index] : null;
	return fanObj !== null ? Math.round(fanObj.max * 100) : 100;
});

// Keep the selector targeted at a controllable fan as tools change or RRF adds/removes fans
function updateFanSelection() {
	if (fan.value === -1) {
		if (!currentTool.value) {
			fan.value = fans.value.findIndex(f => f !== null && f.thermostatic.sensors.length === 0);
		}
		return;
	}
	const target = (fan.value >= 0 && fan.value < fans.value.length) ? fans.value[fan.value] : null;
	if (target === null || target.thermostatic.sensors.length > 0) {
		if (currentTool.value) {
			fan.value = -1;
		} else {
			fan.value = fans.value.findIndex(f => f !== null && f.thermostatic.sensors.length === 0);
		}
	}
}

onMounted(updateFanSelection);
watch(currentTool, updateFanSelection);
watch(fans, updateFanSelection, { deep: true });
</script>
