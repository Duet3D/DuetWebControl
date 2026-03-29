<!-- One row per configured spindle: enable/disable, optional forward/reverse, current RPM, and an
	 RPM combobox prefilled with the user's saved presets clamped to each spindle's allowed range -->
<template>
	<v-card>
		<v-card-title class="d-flex align-center">
			<v-icon class="mr-1">mdi-hammer-screwdriver</v-icon>
			{{ $t("panel.spindle.title") }}
		</v-card-title>

		<v-card-text>
			<v-table density="compact" class="spindle-table">
				<thead>
					<tr>
						<th>{{ $t("panel.spindle.spindle") }}</th>
						<th>{{ $t("panel.spindle.active") }}</th>
						<th v-show="hasReverseableSpindle">{{ $t("panel.spindle.direction") }}</th>
						<th>{{ $t("panel.spindle.currentRPM") }}</th>
						<th>{{ $t("panel.spindle.setRPM") }}</th>
					</tr>
				</thead>
				<tbody>
					<template v-for="(spindle, index) in spindles" :key="index">
						<tr v-if="spindle !== null && isConfigured(spindle)"
							:class="{ 'spindle-active': (spindle.current ?? 0) > 0 && (spindle.active ?? 0) > 0 }">
							<td>{{ getName(index) }}</td>
							<td>
								<v-btn v-if="isActive(spindle)" block @click="spindleOff(index)">
									{{ $t("panel.spindle.on") }}
								</v-btn>
								<v-btn v-else block @click="spindleOn(index)">
									{{ $t("panel.spindle.off") }}
								</v-btn>
							</td>
							<td v-show="hasReverseableSpindle">
								<v-btn-toggle v-show="hasReverseableSpindle && spindle.canReverse" mandatory
											  :model-value="spindleDirections[index] ?? 0"
											  @update:model-value="spindleDirections[index] = $event as number">
									<v-btn>{{ $t("panel.spindle.forward") }}</v-btn>
									<v-btn>{{ $t("panel.spindle.reverse") }}</v-btn>
								</v-btn-toggle>
							</td>
							<td>{{ spindle.current }}</td>
							<td>
								<v-combobox :items="getValidRpm(spindle)" :model-value="spindle.active" hide-details
											@update:model-value="setActiveRPM(index, $event)" />
							</td>
						</tr>
					</template>
				</tbody>
			</v-table>
		</v-card-text>
	</v-card>
</template>

<style scoped lang="scss">
.spindle-table {
	td {
		text-align: center;
		vertical-align: middle;
	}
	tbody tr:hover {
		background-color: transparent !important;
	}
}

.spindle-active {
	animation: spindle-on-pulse 5s infinite;
}

@keyframes spindle-on-pulse {
	0%   { background-color: #00aa00; }
	50%  { background-color: #00ff00; }
	100% { background-color: #00aa00; }
}
</style>

<script setup lang="ts">
import { Spindle, SpindleState } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();

const spindleDirections = reactive<Record<number, number>>({});

const spindles = computed<Array<Spindle | null>>(() => machineStore.model.spindles);
const hasReverseableSpindle = computed(() => spindles.value.some(spindle => spindle?.canReverse));

function getName(spindleIndex: number) {
	return `${i18n.global.t("panel.spindle.spindle")} ${spindleIndex}`;
}

function isConfigured(spindle: Spindle) {
	return spindle.state !== SpindleState.unconfigured;
}

function isActive(spindle: Spindle) {
	return spindle.state === SpindleState.forward || spindle.state === SpindleState.reverse;
}

function spindleCommand(spindleIndex: number, rpm: number) {
	const command = spindleDirections[spindleIndex] ? "M4" : "M3";
	return `${command} P${spindleIndex} S${rpm}`;
}

async function setActiveRPM(spindleIndex: number, value: number | string) {
	const rpm = typeof value === "string" ? parseFloat(value) : value;
	if (!isFinite(rpm)) {
		return;
	}
	await machineStore.sendCode(spindleCommand(spindleIndex, rpm));
}

async function spindleOn(spindleIndex: number) {
	const spindle = spindles.value[spindleIndex];
	if (spindle && spindle.active !== null) {
		await machineStore.sendCode(spindleCommand(spindleIndex, spindle.active));
	}
}

async function spindleOff(spindleIndex: number) {
	await machineStore.sendCode(`M5 P${spindleIndex}`);
}

function getValidRpm(spindle: Spindle): Array<number> {
	if (spindle.min === null || spindle.max === null) {
		return [];
	}
	const values = settingsStore.spindleRPM.filter(rpm => rpm >= spindle.min! && rpm <= spindle.max!);
	if (!values.includes(0)) {
		values.push(0);
	}
	values.sort((a, b) => a - b);
	return values;
}

// Sync forward/reverse buttons with the live OM state so the toggle reflects what the spindle is doing
function updateSpindleDirections() {
	for (let i = 0; i < spindles.value.length; i++) {
		const spindle = spindles.value[i];
		if (spindle?.state === SpindleState.forward) {
			spindleDirections[i] = 0;
		} else if (spindle?.state === SpindleState.reverse) {
			spindleDirections[i] = 1;
		}
	}
}

onMounted(updateSpindleDirections);
watch(spindles, updateSpindleDirections, { deep: true });
</script>
