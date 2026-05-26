<template>
	<PanelCard icon="mdi-format-vertical-align-center" :title="$t('panel.babystepping.caption')">
		<v-card-text class="pt-1">
			<v-btn-toggle v-if="availableAxes.length > 1" v-model="selectedAxis" mandatory
						  variant="text" color="primary" divided :size="largeBtnSize" class="mb-2">
				<v-btn v-for="axis in availableAxes" :key="axis" :value="axis">{{ axis }}</v-btn>
			</v-btn-toggle>

			<i18n-t keypath="panel.babystepping.current" tag="div" class="mb-2">
				<template #axis>{{ selectedAxis }}</template>
				<template #value><span class="text-no-wrap">{{ displayZ(babystepping) }}</span></template>
			</i18n-t>
			<v-row density="compact">
				<v-col>
					<CodeButton :code="babystepCode(-settings.babystepAmount)" no-wait block :size="largeBtnSize">
						<v-icon>mdi-arrow-collapse-vertical</v-icon>
						{{ displayZ(-settings.babystepAmount) }}
					</CodeButton>
				</v-col>
				<v-col>
					<CodeButton :code="babystepCode(settings.babystepAmount)" no-wait block :size="largeBtnSize">
						<v-icon>mdi-arrow-split-horizontal</v-icon>
						+{{ displayZ(settings.babystepAmount) }}
					</CodeButton>
				</v-col>
			</v-row>
		</v-card-text>

		<template #settings>
			<v-number-input v-model="settings.babystepAmount" :min="0.001" :step="0.01" :precision="3"
							:label="$t('panel.babystepping.settings.babystepAmount')"
							v-hint="$t('panel.babystepping.settings.babystepAmountHint')"
							variant="outlined" density="comfortable" hide-details suffix="mm" class="mb-3" />

			<p class="mb-1 mt-0">{{ $t("panel.babystepping.settings.babystepAxes") }}</p>
			<v-btn-toggle v-model="settings.babystepAxes" v-hint="$t('panel.babystepping.settings.babystepAxesHint')"
						  multiple mandatory variant="outlined" color="primary" divided>
				<v-btn v-for="axis in machineAxisLetters" :key="axis" :value="axis">{{ axis }}</v-btn>
			</v-btn-toggle>
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import { Axis, AxisLetter } from "@duet3d/objectmodel";

import CodeButton from "@/components/buttons/CodeButton.vue";
import { useComponentSettings } from "@/composables/useComponentSettings";
import { useLargeButtons } from "@/composables/useLargeButtons";
import { useMachineStore } from "@/stores/machine";
import { displayZ } from "@/utils/display";
import { axisGCodeLetter } from "@/utils/gcode";

const machineStore = useMachineStore();
const { btnSize: largeBtnSize } = useLargeButtons();

// `mandatory` on the settings toggle keeps at least one axis configured. Z is the default and
// the usual choice
const settings = useComponentSettings<{ babystepAmount: number; babystepAxes: Array<AxisLetter> }>({
	babystepAmount: 0.05,
	babystepAxes: [AxisLetter.Z],
});

// Letters of every visible axis on the machine, sorted alphabetically - the candidate set for
// the settings toggle
const machineAxisLetters = computed<Array<AxisLetter>>(() =>
	machineStore.model.move.axes
		.filter((axis: Axis) => axis.visible)
		.map((axis: Axis) => axis.letter)
		.sort());

// Configured axes that actually exist on the machine right now, sorted alphabetically
const availableAxes = computed<Array<AxisLetter>>(() =>
	settings.value.babystepAxes.filter(letter => machineAxisLetters.value.includes(letter)).sort());

const selectedAxis = ref<AxisLetter>(AxisLetter.Z);

// Keep the active axis pointed at one that is still offered, preferring Z
watchEffect(() => {
	if (availableAxes.value.length > 0 && !availableAxes.value.includes(selectedAxis.value)) {
		selectedAxis.value = availableAxes.value.includes(AxisLetter.Z) ? AxisLetter.Z : availableAxes.value[0];
	}
});

const babystepping = computed(() =>
	machineStore.model.move.axes.find(axis => axis.letter === selectedAxis.value)?.babystep ?? 0);

function babystepCode(amount: number): string {
	return `M290 R1 ${axisGCodeLetter(selectedAxis.value)}${amount}`;
}
</script>
