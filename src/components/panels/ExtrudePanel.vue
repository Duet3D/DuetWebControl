<template>
	<PanelCard icon="mdi-opacity" :title="$t('panel.extrude.caption')">
		<v-card-text>
			<v-row class="pb-1 flex-xl-nowrap align-center justify-center">
				<v-col v-if="currentTool && currentTool.extruders.length > 1 && settings.showMixingControls"
					   cols="auto">
					<p class="mb-1">{{ $t("panel.extrude.mixRatio") }}</p>
					<v-btn-toggle v-model="mix" mandatory multiple :size="largeBtnSize">
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
					<v-btn-toggle v-model="amount" mandatory variant="outlined" color="primary" divided
								  :size="largeBtnSize" class="d-flex">
						<v-btn v-for="(savedAmount, index) in settings.extruderAmounts" :key="index"
							   :value="savedAmount" :disabled="uiStore.uiFrozen" class="flex-grow-1"
							   @contextmenu.prevent="editAmount(index)">
							{{ savedAmount }}
						</v-btn>
					</v-btn-toggle>
				</v-col>

				<v-col>
					<p class="mb-1">{{ $t("panel.extrude.feedrate", [feedrateUnit]) }}</p>
					<v-btn-toggle v-model="feedrate" mandatory variant="outlined" color="primary" divided
								  :size="largeBtnSize" class="d-flex">
						<v-btn v-for="(savedFeedrate, index) in settings.extruderFeedrates" :key="index"
							   :value="savedFeedrate" :disabled="uiStore.uiFrozen" class="flex-grow-1"
							   @contextmenu.prevent="editFeedrate(index)">
							{{ savedFeedrate }}
						</v-btn>
					</v-btn-toggle>
				</v-col>

				<v-col cols="12" xl="auto" class="d-flex flex-xl-column ga-2 align-self-xl-end">
					<v-btn tile :size="largeBtnSize" :disabled="uiStore.uiFrozen || !canRetract" :elevation="1"
						   :loading="busy" class="flex-grow-1" @click="buttonClicked(false)">
						<v-icon start>mdi-arrow-up-bold</v-icon>
						{{ $t("panel.extrude.retract") }}
					</v-btn>
					<v-btn tile :size="largeBtnSize" :disabled="uiStore.uiFrozen || !canExtrude" :elevation="1"
						   :loading="busy" class="flex-grow-1" @click="buttonClicked(true)">
						<v-icon start>mdi-arrow-down-bold</v-icon>
						{{ $t("panel.extrude.extrude") }}
					</v-btn>
				</v-col>
			</v-row>
		</v-card-text>

		<template #settings>
			<v-switch v-model="settings.showMixingControls" color="primary"
					  :label="$t('panel.extrude.showMixingControls')"
					  v-hint="$t('panel.extrude.showMixingControlsHint')"
					  density="comfortable" hide-details />
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import { CodeChannel, MachineStatus, Tool } from "@duet3d/objectmodel";

import { getNumericInput } from "@/composables/useInputDialog";
import { useComponentSettings } from "@/composables/useComponentSettings";
import { useLargeButtons } from "@/composables/useLargeButtons";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const uiStore = useUiStore();
const { btnSize: largeBtnSize } = useLargeButtons();

interface ExtrudePanelSettings {
	// Show the per-drive mixing controls for multi-extruder tools
	showMixingControls: boolean;
	// Extrusion amounts (in mm) offered as preset buttons
	extruderAmounts: Array<number>;
	// Extrusion feedrates (in mm/s) offered as preset buttons
	extruderFeedrates: Array<number>;
}

const settings = useComponentSettings<ExtrudePanelSettings>({
	showMixingControls: true,
	extruderAmounts: [100, 50, 20, 10, 5, 1],
	extruderFeedrates: [50, 10, 5, 2, 1],
});

const busy = ref(false);
const mixValue = ref<Array<number | "mix">>(["mix"]);
const amount = ref(10);
const feedrate = ref(5);


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
	if (mixValue.value[0] === "mix" || !settings.value.showMixingControls) {
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

async function editAmount(index: number) {
	const value = await getNumericInput(i18n.global.t("dialog.editExtrusionAmount.title"), i18n.global.t("dialog.editExtrusionAmount.prompt"), settings.value.extruderAmounts[index]);
	if (value === null) {
		return;
	}
	settings.value.extruderAmounts[index] = value;
	amount.value = value;
}

async function editFeedrate(index: number) {
	const value = await getNumericInput(i18n.global.t("dialog.editExtrusionFeedrate.title"), i18n.global.t("dialog.editExtrusionFeedrate.prompt"), settings.value.extruderFeedrates[index]);
	if (value === null) {
		return;
	}
	settings.value.extruderFeedrates[index] = value;
	feedrate.value = value;
}

onMounted(() => {
	amount.value = settings.value.extruderAmounts[3];
	feedrate.value = settings.value.extruderFeedrates[3];
});

watch(currentTool, (to) => {
	if (to === null || to.extruders.length <= 1) {
		mix.value = ["mix"];
	}
});

watch(() => settings.value.extruderAmounts, () => {
	amount.value = settings.value.extruderAmounts[3];
});
watch(() => settings.value.extruderFeedrates, () => {
	feedrate.value = settings.value.extruderFeedrates[3];
});
</script>
