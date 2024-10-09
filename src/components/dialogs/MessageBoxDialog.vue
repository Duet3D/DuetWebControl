<template>
	<v-dialog v-model="shown" :no-click-animation="isPersistent" :persistent="isPersistent">
		<v-card :title="messageBox.title" class="text-center">
			<v-card-text>
				<!-- Main message -->
				<div :class="{ 'mb-6': displayedAxes.length > 0 }" v-html="messageBox.message">
				</div>

				<!-- Jog control -->
				<v-row v-for="axis in displayedAxes" :key="axis.letter" dense>
					<!-- Decreasing movements -->
					<v-col>
						<v-row no-gutters>
							<v-col v-for="index in settingsStore.moveSteps[axis.letter].length" :key="index"
								   :class="getMoveCellClass(index - 1)">
								<CodeButton :code="getMoveCode(axis, index - 1, true)" :disabled="!canMove(axis)"
											no-wait block tile class="move-btn">
									<v-icon>mdi-chevron-left</v-icon>
									{{ axis.letter + showSign(-settingsStore.moveSteps[axis.letter][index - 1]) }}
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
							<v-col v-for="index in settingsStore.moveSteps[axis.letter].length" :key="index"
								   :class="getMoveCellClass(settingsStore.moveSteps[axis.letter].length - index)">
								<CodeButton :code="getMoveCode(axis, settingsStore.moveSteps[axis.letter].length - index, false)"
											:disabled="!canMove(axis)" no-wait block tile class="move-btn">
									{{ axis.letter + showSign(settingsStore.moveSteps[axis.letter][settingsStore.moveSteps[axis.letter].length - index]) }}
									<v-icon>mdi-chevron-right</v-icon>
								</CodeButton>
							</v-col>
						</v-row>
					</v-col>
				</v-row>

				<!-- Inputs-->
				<form v-if="needsNumberInput || needsStringInput" class="mt-3" @submit.prevent="ok">
					<v-text-field v-if="needsNumberInput" type="number" autofocus v-model.number="numberInput"
								  :min="messageBox.min" :max="messageBox.max"
								  :step="needsIntInput ? 1 : 'any'" required hide-details />
					<v-text-field v-else type="text" autofocus v-model="stringInput" :minlength="messageBox.min"
								  :maxlength="messageBox.max || 100" required hide-details />
				</form>
			</v-card-text>

			<v-card-actions v-if="hasButtons" class="flex-wrap justify-center">
				<template v-if="isMultipleChoice">
					<v-btn v-for="(choice, index) in messageBox.choices" :key="choice" color="blue darken-1"
						   :text="(messageBox.default !== index) ? choice : undefined" @click="accept(index)">
						{{ choice }}
					</v-btn>
					<v-btn v-if="messageBox.cancelButton" color="blue darken-1" :text="$t('generic.cancel')"
						   @click="cancel" />
				</template>
				<template v-else>
					<v-btn color="blue darken-1" :text="isPersistent ? $t('generic.ok') : $t('generic.close')" @click="ok"
						   :disabled="!canConfirm" />
					<v-btn v-if="messageBox.cancelButton" color="blue darken-1" :text="$t('generic.cancel')"
						   @click="cancel" />
				</template>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { Axis, AxisLetter, MessageBox, MessageBoxMode } from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";

import i18n from "@/i18n";
import { display, displayZ } from "@/utils/display";
import { isNumber } from "@/utils/numbers";

const machineStore = useMachineStore(), settingsStore = useSettingsStore();

// Message box data
const messageBox = reactive(new MessageBox()), shown = ref(false);
const numberInput = ref(0), stringInput = ref("");

// Observers for message box data
watch(() => machineStore.isReconnecting, (to) => {
	if (to) {
		shown.value = false;
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

// UI helpers
function getMoveCellClass(index: number): string {
	let classes = "";
	if (index === 0 || index === 5) {
		classes += "hidden-lg-and-down";
	}
	if (index > 1 && index < 4 && index % 2 === 1) {
		classes += "hidden-md-and-down";
	}
	return classes;
}

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


function getMoveCode(axis: Axis, index: number, decrementing: boolean): string {
	return `M120\nG91\nG1 ${/[a-z]/.test(axis.letter) ? '\'' : ""}${axis.letter}${decrementing ? '-' : ""}${settingsStore.moveSteps[axis.letter][index]} F${settingsStore.moveFeedrate}\nM121`;
}

function showSign(value: number) {
	return (value > 0) ? `+${value}` : value.toString();
}

async function ok() {
	shown.value = false;
	if ([MessageBoxMode.closeOnly, MessageBoxMode.okOnly, MessageBoxMode.okCancel].includes(messageBox.mode)) {
		await machineStore.sendCode(`M292 S${messageBox.seq}`);
	} else if (messageBox.mode === MessageBoxMode.intInput || messageBox.mode === MessageBoxMode.floatInput) {
		await machineStore.sendCode(`M292 R{${numberInput.value}} S${messageBox.seq}`);
	} else if (messageBox.mode === MessageBoxMode.stringInput) {
		await machineStore.sendCode(`M292 R{"${stringInput.value.replace(/"/g, '""').replace(/'/g, "''")}"} S${messageBox.seq}`);
	}
}

async function accept(choice: number) {
	shown.value = false;
	if (messageBox.mode >= MessageBoxMode.multipleChoice) {
		await machineStore.sendCode(`M292 R{${choice}} S${messageBox.seq}`);
	}
}

async function cancel() {
	shown.value = false;
	if (messageBox.cancelButton) {
		await machineStore.sendCode(`M292 P1 S${messageBox.seq}`);
	}
}
</script>
