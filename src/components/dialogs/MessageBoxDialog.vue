<style scoped>
.emergency-overlay {
	position: absolute;
	top: 0;
	right: 0;
}
</style>

<template>
	<v-dialog v-model="shown" :no-click-animation="isPersistent" :persistent="isPersistent">
		<v-card :title="messageBox.title" class="text-center">
			<v-card-text>
				<!-- Main message -->
				<div :class="{ 'mb-6': displayedAxes.length > 0 }" v-html="messageBox.message">
				</div>

				<!-- Jog control -->
				<v-row v-for="axis in displayedAxes" :key="axis.letter" density="compact">
					<!-- Decreasing movements -->
					<v-col>
						<v-row no-gutters>
							<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(index - 1, true)">
								<CodeButton :code="getMoveCode(axis, index - 1, true)" :disabled="!canMove(axis)"
											no-wait block tile class="move-btn"
											@contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)">
									<v-icon>mdi-chevron-left</v-icon>
									{{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
								</CodeButton>
							</v-col>
						</v-row>
					</v-col>

					<!-- Current position -->
					<v-col cols="auto" class="d-flex align-center px-3">
						<strong>
							{{ axis.letter + ' = ' + displayAxisPosition(axis) }}
						</strong>
					</v-col>

					<!-- Increasing movements -->
					<v-col>
						<v-row no-gutters>
							<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(numMoveSteps - index, true)">
								<CodeButton :code="getMoveCode(axis, numMoveSteps - index, false)" :disabled="!canMove(axis)"
											no-wait block tile class="move-btn"
											@contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)">
									{{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }}
									<v-icon>mdi-chevron-right</v-icon>
								</CodeButton>
							</v-col>
						</v-row>
					</v-col>
				</v-row>

				<!-- Inputs -->
				<form v-if="needsNumberInput || needsStringInput" class="mt-3" @submit.prevent="ok">
					<v-text-field v-if="needsNumberInput" type="number" autofocus v-model.number="numberInput"
								  :min="messageBox.min" :max="messageBox.max" :step="needsIntInput ? 1 : 'any'" required
								  hide-details />
					<v-text-field v-else type="text" autofocus v-model="stringInput" :minlength="messageBox.min"
								  :maxlength="messageBox.max || 100" required hide-details />
				</form>
			</v-card-text>

			<v-card-actions v-if="hasButtons" class="flex-wrap justify-center">
				<template v-if="isMultipleChoice">
					<v-btn v-for="(choice, index) in messageBox.choices" :key="choice"
						   :variant="(messageBox.default === index) ? 'tonal' : 'text'" :text="choice"
						   :autofocus="messageBox.default === index" @click="accept(index)" />
					<v-btn v-if="messageBox.cancelButton" :text="$t('generic.cancel')" @click="cancel" />
				</template>
				<template v-else>
					<v-btn :text="isPersistent ? $t('generic.ok') : $t('generic.close')"
						   :disabled="!canConfirm"
						   :autofocus="!needsNumberInput && !needsStringInput" @click="ok" />
					<v-btn v-if="messageBox.cancelButton" :text="$t('generic.cancel')" @click="cancel" />
				</template>
			</v-card-actions>
		</v-card>

		<!-- Emergency stop stays reachable while a persistent box covers the app bar; revealed with a
			 short delay so it can't catch a tap meant for the dialog as it opens -->
		<div v-if="settingsStore.showEmergencyStop && emergencyStopReady" class="emergency-overlay pe-4 pt-3">
			<EmergencyButton />
		</div>
	</v-dialog>
</template>

<script setup lang="ts">
import { Axis, AxisLetter, MessageBox, MessageBoxMode } from "@duet3d/objectmodel";

import { useComponentSettings } from "@/composables/useComponentSettings";
import { defaultMoveSteps, getMoveCellClass, type MoveStepMap, useMoveSteps } from "@/composables/useMoveSteps";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";

import i18n from "@/i18n";
import { display, displayZ } from "@/utils/display";
import { axisGCodeLetter } from "@/utils/gcode";
import { isNumber } from "@/utils/numbers";

const machineStore = useMachineStore(), settingsStore = useSettingsStore();

// The dialog lives outside any page, so its settings id must be pinned instead of derived from the route
const settings = useComponentSettings<{ moveSteps: MoveStepMap }>({ moveSteps: defaultMoveSteps() }, { id: "MessageBoxDialog" });
const { numMoveSteps, moveSteps, showMoveStepDialog } = useMoveSteps(settings);

// Message box data
const messageBox = reactive(new MessageBox()), shown = ref(false);
const numberInput = ref(0), stringInput = ref("");

// Observers for message box data
watch(() => machineStore.isReconnecting, (to) => {
	if (to) {
		shown.value = false;
	} else if (machineStore.model.state.messageBox !== null && machineStore.model.state.messageBox.mode !== null) {
		// A box still open across a reconnect keeps its reference, so the messageBox watcher won't re-fire it
		shown.value = true;
	}
});

watch(() => machineStore.model.state.messageBox, (to) => {
	if (to !== null && to.mode !== null) {
		numberInput.value = (typeof to.default === "number") ? to.default : 0;
		stringInput.value = (typeof to.default === "string") ? to.default : "";
		messageBox.update(to);
		shown.value = true;
	} else {
		shown.value = false;
	}
}, { deep: true });

const displayedAxes = computed(() => {
	const axisControls = (messageBox.axisControls !== null) ? messageBox.axisControls : 0;
	return machineStore.model.move.axes.filter((axis, index) => axis.visible && ((axisControls & (1 << index)) !== 0));
});

const hasButtons = computed(() => {
	return (messageBox.mode !== MessageBoxMode.noButtons);
});

const isMultipleChoice = computed(() => {
	return (messageBox.mode === MessageBoxMode.multipleChoice);
});

const isPersistent = computed(() => {
	return (messageBox.mode >= MessageBoxMode.okOnly);
});

// Delay revealing the emergency-stop overlay on persistent boxes so it doesn't flash in during the
// dialog open transition and can't be hit by a stray tap aimed at the dialog
const emergencyStopReady = ref(false);
let emergencyStopTimer: ReturnType<typeof setTimeout> | null = null;
watch(shown, (to) => {
	if (emergencyStopTimer !== null) {
		clearTimeout(emergencyStopTimer);
		emergencyStopTimer = null;
	}
	if (to && isPersistent.value) {
		emergencyStopTimer = setTimeout(() => { emergencyStopReady.value = true; }, 500);
	} else {
		emergencyStopReady.value = false;
	}
});

const needsIntInput = computed(() => {
	return (messageBox.mode === MessageBoxMode.intInput);
});

const needsNumberInput = computed(() => {
	return ([MessageBoxMode.intInput, MessageBoxMode.floatInput].includes(messageBox.mode));
});

const needsStringInput = computed(() => {
	return (messageBox.mode === MessageBoxMode.stringInput);
});

const canConfirm = computed(() => {
	if (needsNumberInput.value) {
		let canConfirm;
		if (messageBox.mode === MessageBoxMode.intInput) {
			canConfirm = isNumber(numberInput.value) && numberInput.value === Math.round(numberInput.value);
		} else {
			canConfirm = isNumber(numberInput.value);
		}
		return canConfirm && ((messageBox.min === null) || (numberInput.value >= messageBox.min)) && ((messageBox.max === null) || (numberInput.value <= messageBox.max));
	}

	if (needsStringInput.value) {
		return ((messageBox.min === null) || (stringInput.value.length >= messageBox.min)) && ((messageBox.max === null) || (stringInput.value.length <= messageBox.max));
	}
	return true;
});

function canMove(axis: Axis): boolean {
	return axis.homed || !machineStore.model.move.noMovesBeforeHoming;
}

function displayAxisPosition(axis: Axis): string {
	if (axis.userPosition === null) {
		return i18n.global.t("generic.noValue");
	}
	return (axis.letter === AxisLetter.Z) ? displayZ(axis.userPosition, false) : display(axis.userPosition, 1);
}


// Fixed jog feedrate for the message-box axis controls; the per-panel jog feedrate lives on the
// Movement panel and is not reachable from this firmware-driven dialog
const moveFeedrate = 6000;

function getMoveCode(axis: Axis, index: number, decrementing: boolean): string {
	const sign = decrementing ? "-" : "";
	return `M120\nG91\nG1 ${axisGCodeLetter(axis.letter)}${sign}${moveSteps(axis.letter)[index]} F${moveFeedrate}\nM121`;
}

function showSign(value: number) {
	return (value > 0) ? `+${value}` : value.toString();
}

async function ok() {
	shown.value = false;
	if ([MessageBoxMode.closeOnly, MessageBoxMode.okOnly, MessageBoxMode.okCancel].includes(messageBox.mode)) {
		await machineStore.sendCode(`M292 S${messageBox.seq}`, false, false);
	} else if (messageBox.mode === MessageBoxMode.intInput || messageBox.mode === MessageBoxMode.floatInput) {
		await machineStore.sendCode(`M292 R{${numberInput.value}} S${messageBox.seq}`, false, false);
	} else if (messageBox.mode === MessageBoxMode.stringInput) {
		await machineStore.sendCode(`M292 R{"${stringInput.value.replace(/"/g, '""').replace(/'/g, "''")}"} S${messageBox.seq}`, false, false);
	}
}

async function accept(choice: number) {
	shown.value = false;
	if (messageBox.mode >= MessageBoxMode.multipleChoice) {
		await machineStore.sendCode(`M292 R{${choice}} S${messageBox.seq}`, false, false);
	}
}

async function cancel() {
	shown.value = false;
	if (messageBox.cancelButton) {
		await machineStore.sendCode(`M292 P1 S${messageBox.seq}`, false, false);
	}
}
</script>
