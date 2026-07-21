<template>
	<PanelCard icon="mdi-fan" :title="$t('panel.fan.caption')">
		<v-card-text class="pt-0">
			<v-row class="align-start">
				<v-col cols="12" sm="auto" class="order-1 order-sm-0">
					<p class="mb-1">{{ $t("panel.fan.selection") }}</p>
					<v-btn-toggle v-model="fan" mandatory variant="outlined" color="primary" divided>
						<v-btn v-if="currentTool && currentTool.fans.length > 0 && displayedFans.includes(-1)"
							   :value="-1">
							{{ $t("panel.fan.toolFan") }}
						</v-btn>
						<template v-for="(fanModel, index) in fans" :key="index">
							<v-btn v-if="fanModel && fanModel.thermostatic.sensors.length === 0
											&& displayedFans.includes(index)"
								   :value="index" :disabled="uiStore.uiFrozen">
								{{ fanModel.name || $t("panel.fan.fan", [index]) }}
							</v-btn>
						</template>
					</v-btn-toggle>
				</v-col>

				<v-col cols="12" sm="auto" class="flex-sm-grow-1 order-0 order-sm-1">
					<PercentageInput v-model="fanValue" :max="maxFanValue" :step="settings.stepWidth"
									 :disabled="uiStore.uiFrozen" />
				</v-col>
			</v-row>
		</v-card-text>

		<template #settings>
			<EntityVisibilityList kind="fans" :label="$t('panel.fan.displayedFans')"
								  v-model="settings.displayedFans" />

			<v-number-input v-model="settings.stepWidth" :min="1" :step="1" :precision="0" class="mt-3"
							:label="$t('panel.fan.settings.stepWidth')"
							v-hint="$t('panel.fan.settings.stepWidthHint')"
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

const fan = ref(-1);

const fans = computed<Array<Fan | null>>(() => machineStore.model.fans);
const currentTool = computed(() => machineStore.currentTool);

// Tool fan (-1) plus every non-thermostatic fan - matches the "fans" EntityVisibilityList kind
const controllableFanIndices = computed<Array<number>>(() => {
	const list = [-1];
	fans.value.forEach((fanModel, index) => {
		if (fanModel !== null && fanModel.thermostatic.sensors.length === 0) {
			list.push(index);
		}
	});
	return list;
});

const displayedFans = computed<Array<number>>(() => settings.value.displayedFans ?? controllableFanIndices.value);

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

// Keep the selector on a fan that is both controllable and currently displayed, as tools change,
// RRF adds/removes fans, or the visibility overlay changes
function updateFanSelection() {
	if (fan.value === -1) {
		if (displayedFans.value.includes(-1) && currentTool.value && currentTool.value.fans.length > 0) {
			return;
		}
	} else {
		const target = (fan.value >= 0 && fan.value < fans.value.length) ? fans.value[fan.value] : null;
		if (target !== null && target.thermostatic.sensors.length === 0 && displayedFans.value.includes(fan.value)) {
			return;
		}
	}
	fan.value = fans.value.findIndex((fanModel, index) =>
		fanModel !== null && fanModel.thermostatic.sensors.length === 0 && displayedFans.value.includes(index));
}

onMounted(updateFanSelection);
watch(currentTool, updateFanSelection);
watch(fans, updateFanSelection, { deep: true });
watch(displayedFans, updateFanSelection);
</script>
