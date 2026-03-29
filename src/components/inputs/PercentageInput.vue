<!-- Slider + inc/dec input for 0-100 % values. Holding the +/- buttons auto-repeats after a short
	 delay. In the numeric-inputs mode the slider is replaced by a v-combobox with snapped values.
	 The optional lock button blocks accidental slider drags on mobile until explicitly unlocked -->
<template>
	<v-row dense align="center">
		<v-col cols="auto">
			<v-btn v-if="!settingsStore.numericInputs && canLock" icon size="large" variant="text" class="me-1"
				   :color="isLocked ? 'error' : undefined" :disabled="disabled" @click="isLocked = !isLocked">
				<v-icon>{{ isLocked ? "mdi-lock" : "mdi-lock-off" }}</v-icon>
			</v-btn>

			<v-btn icon size="large" variant="text" class="ml-0" :disabled="disabled || innerValue <= min"
				   @click="applyStep(-step)" @mousedown="mouseDown(false)" @mouseup="mouseUp(false)"
				   @mouseleave="mouseUp(false)" @touchstart.passive="mouseDown(false)" @touchend="mouseUp(false)">
				<v-icon>mdi-minus</v-icon>
			</v-btn>
		</v-col>

		<v-col v-if="settingsStore.numericInputs" class="d-flex align-center">
			<v-combobox v-model="innerValue" type="number" :min="min" :max="max" step="any"
						:disabled="disabled" :items="items" hide-selected hide-details
						:menu-props="{ maxHeight: '50%' }" class="mx-2"
						@update:search="updateValue" @keyup.enter="apply">
				<template #append-inner>
					<v-icon>mdi-percent</v-icon>
				</template>
			</v-combobox>
			<v-btn class="mr-1" color="primary" :disabled="!canApply" @click="apply">
				<v-icon start>mdi-check</v-icon>
				{{ $t("input.set") }}
			</v-btn>
		</v-col>
		<v-col v-else>
			<v-slider :model-value="innerValue" :min="min" :max="max" :disabled="disabled"
					  :readonly="isLocked && canLock" hide-details thumb-label="always" class="slider"
					  @update:model-value="onSliderChange" />
		</v-col>

		<v-col cols="auto">
			<v-btn icon size="large" variant="text" class="mr-0" :disabled="disabled || innerValue >= max"
				   @click="applyStep(step)" @mousedown="mouseDown(true)" @mouseup="mouseUp(true)"
				   @mouseleave="mouseUp(true)" @touchstart.passive="mouseDown(true)" @touchend="mouseUp(true)">
				<v-icon>mdi-plus</v-icon>
			</v-btn>
		</v-col>
	</v-row>
</template>

<style scoped>
.slider {
	margin-top: 40px;
}
</style>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import { useSettingsStore } from "@/stores/settings";
import { isNumber } from "@/utils/numbers";

const props = withDefaults(defineProps<{
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
}>(), {
	min: 0,
	max: 100,
	step: 5,
	disabled: false,
});

const modelValue = defineModel<number>({ required: true });
const settingsStore = useSettingsStore();

// Tunables for the slider's apply debounce and for press-and-hold auto-repeat
const debounceTime = 500;
const changeTime = 300;
const changeInterval = 150;

const innerValue = ref(modelValue.value);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let decreaseTimer: ReturnType<typeof setTimeout> | null = null;
let increaseTimer: ReturnType<typeof setTimeout> | null = null;

const canApply = computed(() => {
	if (props.disabled || innerValue.value === Math.round(modelValue.value)
		|| debounceTimer || decreaseTimer || increaseTimer) {
		return false;
	}
	return isNumber(innerValue.value) && innerValue.value >= props.min && innerValue.value <= props.max;
});

function apply() {
	if (canApply.value) {
		modelValue.value = innerValue.value;
	}
}

function updateValue(value: string) {
	innerValue.value = parseFloat(value);
}

function onSliderChange(value: number) {
	innerValue.value = value;
	modelValue.value = value;
}

watch(modelValue, (to) => {
	const rounded = Math.round(to);
	if (innerValue.value !== rounded) {
		innerValue.value = rounded;
	}
});

// Pre-fill combobox dropdown with snapped values around the current setting (or the full range when bounded)
const items = computed(() => {
	if (settingsStore.disableAutoComplete || !props.step) {
		return [];
	}
	const result: Array<number> = [];
	if (isNumber(props.min) && isNumber(props.max)) {
		for (let value = props.min; value <= props.max; value += props.step) {
			result.push(value);
		}
	} else {
		for (let i = 5; i >= 1; i--) {
			const lower = modelValue.value - props.step * i;
			if (lower >= props.min) {
				result.push(lower);
			}
		}
		for (let i = 1; i <= 5; i++) {
			const higher = modelValue.value + props.step * i;
			if (higher > props.max) {
				break;
			}
			result.push(higher);
		}
	}
	return result;
});

// Optional lock button for mobile only - keeps the slider from reacting to incidental swipes
const { mobile } = useDisplay();
const canLock = computed(() => mobile.value);
const isLocked = ref(true);

function applyStep(diff: number) {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}
	innerValue.value = Math.round(Math.min(props.max, Math.max(props.min, innerValue.value + diff)));
	debounceTimer = setTimeout(() => {
		modelValue.value = innerValue.value;
		debounceTimer = null;
	}, debounceTime);
}

function mouseDown(increment: boolean) {
	if (increment) {
		increaseTimer = setTimeout(increase, changeTime);
	} else {
		decreaseTimer = setTimeout(decrease, changeTime);
	}
}

function mouseUp(increment: boolean) {
	if (increment && increaseTimer !== null) {
		clearTimeout(increaseTimer);
		increaseTimer = null;
	} else if (decreaseTimer !== null) {
		clearTimeout(decreaseTimer);
		decreaseTimer = null;
	}
}

function decrease() {
	applyStep(-props.step);
	decreaseTimer = setTimeout(decrease, changeInterval);
}

function increase() {
	applyStep(props.step);
	increaseTimer = setTimeout(increase, changeInterval);
}
</script>
