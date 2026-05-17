<template>
	<v-card>
		<v-card-title class="d-flex align-center pb-0">
			<v-icon size="small" class="mr-1">mdi-opacity</v-icon>
			{{ $t("panel.extrude.caption") }}
		</v-card-title>

		<v-card-text>
			<v-row class="pb-1 flex-xl-nowrap" align="center" justify="center">
				<v-col v-if="currentTool && currentTool.extruders.length > 1 && settingsStore.showMixingControls" cols="auto">
					<p class="mb-1">{{ $t("panel.extrude.mixRatio") }}</p>
					<v-btn-toggle v-model="mix" mandatory multiple>
						<v-btn value="mix" :disabled="uiStore.uiFrozen" color="primary" variant="text">
							{{ $t("panel.extrude.mix") }}
						</v-btn>
						<v-btn v-for="extruder in currentTool.extruders" :key="extruder" :value="extruder"
							   :disabled="uiStore.uiFrozen" color="primary" variant="text">
							{{ `E${extruder}` }}
						</v-btn>
					</v-btn-toggle>
				</v-col>

				<v-col>
					<p class="mb-1">{{ $t("panel.extrude.amount", [amountUnit]) }}</p>
					<v-btn-toggle v-model="amount" mandatory variant="outlined" color="primary" divided class="d-flex">
						<v-btn v-for="(savedAmount, index) in settingsStore.extruderAmounts" :key="index"
							   :value="savedAmount" :disabled="uiStore.uiFrozen" class="flex-grow-1"
							   @contextmenu.prevent="editAmount(index)">
							{{ savedAmount }}
						</v-btn>
					</v-btn-toggle>
				</v-col>

				<v-col>
					<p class="mb-1">{{ $t("panel.extrude.feedrate", [feedrateUnit]) }}</p>
					<v-btn-toggle v-model="feedrate" mandatory variant="outlined" color="primary" divided class="d-flex">
						<v-btn v-for="(savedFeedrate, index) in settingsStore.extruderFeedrates" :key="index"
							   :value="savedFeedrate" :disabled="uiStore.uiFrozen" class="flex-grow-1"
							   @contextmenu.prevent="editFeedrate(index)">
							{{ savedFeedrate }}
						</v-btn>
					</v-btn-toggle>
				</v-col>

				<v-col cols="12" xl="auto" class="d-flex flex-xl-column ga-2 align-self-xl-end">
					<v-btn tile :disabled="uiStore.uiFrozen || !canRetract" :elevation="1" :loading="busy"
						   class="flex-grow-1" @click="buttonClicked(false)">
						<v-icon start>mdi-arrow-up-bold</v-icon>
						{{ $t("panel.extrude.retract") }}
					</v-btn>
					<v-btn tile :disabled="uiStore.uiFrozen || !canExtrude" :elevation="1" :loading="busy"
						   class="flex-grow-1" @click="buttonClicked(true)">
						<v-icon start>mdi-arrow-down-bold</v-icon>
						{{ $t("panel.extrude.extrude") }}
					</v-btn>
				</v-col>
			</v-row>
		</v-card-text>

		<InputDialog v-model:shown="editAmountDialog.shown" :title="$t('dialog.editExtrusionAmount.title')"
					 :prompt="$t('dialog.editExtrusionAmount.prompt')" :preset="editAmountDialog.preset"
					 is-numeric-value @confirmed="setAmount" />
		<InputDialog v-model:shown="editFeedrateDialog.shown" :title="$t('dialog.editExtrusionFeedrate.title')"
					 :prompt="$t('dialog.editExtrusionFeedrate.prompt')" :preset="editFeedrateDialog.preset"
					 is-numeric-value @confirmed="setFeedrate" />
	</v-card>
</template>

<script setup lang="ts">
import { CodeChannel, MachineStatus, Tool } from "@duet3d/objectmodel";

import InputDialog from "@/components/dialogs/InputDialog.vue";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const busy = ref(false);
const mixValue = ref<Array<number | "mix">>(["mix"]);
const amount = ref(10);
const feedrate = ref(5);

const editAmountDialog = reactive({ shown: false, index: 0, preset: 0 });
const editFeedrateDialog = reactive({ shown: false, index: 0, preset: 0 });

const currentTool = computed<Tool | null>(() => machineStore.currentTool);

const amountUnit = computed(() => machineStore.model.inputs[CodeChannel.http]?.distanceUnit ?? "mm");
const feedrateUnit = computed(() => `${amountUnit.value}/s`);

// Cold-extrusion guard: every heater assigned to the current tool must report at least coldExtrudeTemperature
// Missing heaters or sensors count as cold so we never let the user blindly extrude with broken telemetry
function canMove(coldThreshold: number): boolean {
	const status = machineStore.model.state.status;
	if (status === MachineStatus.off || status === MachineStatus.pausing
		|| status === MachineStatus.processing || status === MachineStatus.resuming) {
		return false;
	}
	const tool = currentTool.value;
	if (tool === null || tool.extruders.length === 0) {
		return false;
	}
	return !tool.heaters.some(heaterNumber => {
		const heater = machineStore.model.heat.heaters[heaterNumber];
		if (heater === null || heater === undefined) {
			return true;
		}
		const sensor = machineStore.model.sensors.analog[heater.sensor];
		if (sensor === null || sensor === undefined) {
			return true;
		}
		return sensor.lastReading === null || sensor.lastReading < coldThreshold;
	});
}

const canExtrude = computed(() => canMove(machineStore.model.heat.coldExtrudeTemperature));
const canRetract = computed(() => canMove(machineStore.model.heat.coldRetractTemperature));

// "mix" + per-extruder buttons are mutually exclusive even though the toggle is in multi-select mode
// The setter enforces that invariant so the UI never lands in a half-toggled state
const mix = computed<Array<number | "mix">>({
	get: () => mixValue.value,
	set: (value) => {
		if (value.length > 1) {
			const wasMixActive = mixValue.value.includes("mix");
			const willBeMixActive = value.includes("mix");
			if (wasMixActive !== willBeMixActive) {
				// User toggled "mix" - switch entirely between mix vs. extruder selection
				mixValue.value = willBeMixActive ? ["mix"] : value.filter(item => item !== "mix");
			} else {
				// Picked another extruder while mix-on - drop mix
				mixValue.value = value.filter(item => item !== "mix");
			}
		} else {
			mixValue.value = value;
		}
	}
});

async function buttonClicked(extrude: boolean) {
	const tool = currentTool.value;
	if (tool === null || tool.extruders.length === 0) {
		return;
	}

	let amounts: Array<number>;
	if (mixValue.value[0] === "mix" || !settingsStore.showMixingControls) {
		// RRF distributes a single positional value across all extruder drives in mixing mode
		amounts = [amount.value];
	} else {
		amounts = tool.extruders.map(extruder => mixValue.value.includes(extruder) ? amount.value : 0);
	}

	busy.value = true;
	try {
		const signed = amounts.map(v => extrude ? v : -v).join(":");
		await machineStore.sendCode(`M120\nM83\nG1 E${signed} F${feedrate.value * 60}\nM121`);
	} catch (e) {
		// handled before we get here
	}
	busy.value = false;
}

function editAmount(index: number) {
	editAmountDialog.index = index;
	editAmountDialog.preset = settingsStore.extruderAmounts[index];
	editAmountDialog.shown = true;
}

function setAmount(value: string | number) {
	settingsStore.setExtrusionAmount(editAmountDialog.index, value as number);
	amount.value = value as number;
}

function editFeedrate(index: number) {
	editFeedrateDialog.index = index;
	editFeedrateDialog.preset = settingsStore.extruderFeedrates[index];
	editFeedrateDialog.shown = true;
}

function setFeedrate(value: string | number) {
	settingsStore.setExtrusionFeedrate(editFeedrateDialog.index, value as number);
	feedrate.value = value as number;
}

onMounted(() => {
	amount.value = settingsStore.extruderAmounts[3];
	feedrate.value = settingsStore.extruderFeedrates[3];
});

watch(currentTool, (to) => {
	if (to === null || to.extruders.length <= 1) {
		mix.value = ["mix"];
	}
});

watch(() => settingsStore.extruderAmounts, () => {
	amount.value = settingsStore.extruderAmounts[3];
});
watch(() => settingsStore.extruderFeedrates, () => {
	feedrate.value = settingsStore.extruderFeedrates[3];
});
</script>
