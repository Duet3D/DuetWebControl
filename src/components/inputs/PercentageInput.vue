<style scoped>
.slider {
	margin-top: 40px;
}
</style>

<template>
	<v-row density="compact" class="align-center">
		<v-col v-if="numericInput">
			<v-number-input v-model="innerValue" :min="min" :max="max" :step="step" :precision="0"
							:disabled="disabled" control-variant="split" hide-details
							variant="outlined" density="compact" suffix="%" class="mb-2" />
		</v-col>

		<template v-else>
			<v-col cols="auto">
				<v-btn v-if="lockable" icon :size="stepBtnSize" variant="text" class="me-1"
					   :color="isLocked ? 'error' : undefined" :disabled="disabled" @click="isLocked = !isLocked">
					<v-icon>{{ isLocked ? "mdi-lock" : "mdi-lock-off" }}</v-icon>
				</v-btn>

				<v-btn icon :size="stepBtnSize" variant="text" class="ml-0"
					   :disabled="disabled || innerValue <= min"
					   @click="applyStep(-step)" @mousedown="mouseDown(false)" @mouseup="mouseUp(false)"
					   @mouseleave="mouseUp(false)" @touchstart.passive="mouseDown(false)" @touchend="mouseUp(false)">
					<v-icon>mdi-minus</v-icon>
				</v-btn>
			</v-col>

			<v-col>
				<v-slider :model-value="innerValue" :min="min" :max="max" :disabled="disabled" color="primary" thumb-color="primary"
						  :readonly="isLocked && lockable" hide-details thumb-label="always" class="slider"
						  @update:model-value="innerValue = $event" @end="onSliderEnd">
					<template #thumb-label="{ modelValue: thumbValue }">
						{{ Math.round(thumbValue) }}&nbsp;%
					</template>
				</v-slider>
			</v-col>

			<v-col cols="auto">
				<v-btn icon :size="stepBtnSize" variant="text" class="mr-0"
					   :disabled="disabled || innerValue >= max"
					   @click="applyStep(step)" @mousedown="mouseDown(true)" @mouseup="mouseUp(true)"
					   @mouseleave="mouseUp(true)" @touchstart.passive="mouseDown(true)" @touchend="mouseUp(true)">
					<v-icon>mdi-plus</v-icon>
				</v-btn>
			</v-col>
		</template>
	</v-row>
</template>

<script setup lang="ts">
import { useLargeButtons } from "@/composables/useLargeButtons";
import { isNumber } from "@/utils/numbers";

const props = withDefaults(defineProps<{
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	// Show a numeric entry field instead of the slider
	numericInput?: boolean;
	// Show a lock button that toggles slider readonly to prevent accidental drags
	lockable?: boolean;
}>(), {
	min: 0,
	max: 100,
	step: 5,
	disabled: false,
	numericInput: false,
	lockable: false,
});

const modelValue = defineModel<number>({ required: true });

// Tunables for the apply debounce and for press-and-hold auto-repeat
const debounceTime = 500;
const changeTime = 300;
const changeInterval = 150;

const innerValue = ref(modelValue.value);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let decreaseTimer: ReturnType<typeof setTimeout> | null = null;
let increaseTimer: ReturnType<typeof setTimeout> | null = null;

// Commit only when the handle is released - @update:model-value just tracks the thumb during a
// drag so a single drag doesn't fire one write (a G-code) per intermediate value
function onSliderEnd(value: number) {
	innerValue.value = value;
	modelValue.value = value;
}

watch(modelValue, (to) => {
	const rounded = Math.round(to);
	if (innerValue.value !== rounded) {
		innerValue.value = rounded;
	}
});

// Numeric mode commits on a debounce so the v-number-input's spinner and keystrokes don't fire
// one G-code per intermediate value. Slider mode commits through onSliderEnd / applyStep
watch(innerValue, (value) => {
	if (!props.numericInput) {
		return;
	}
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}
	debounceTimer = setTimeout(() => {
		debounceTimer = null;
		if (isNumber(value) && value >= props.min && value <= props.max
			&& Math.round(modelValue.value) !== value) {
			modelValue.value = value;
		}
	}, debounceTime);
});

// Optional lock button - keeps the slider from reacting to incidental drags until unlocked
const isLocked = ref(true);

// The lock / minus / plus buttons run at v-btn size="large" by default for finger reach; on
// small touchscreens with largeButtons on they bump one step further to keep parity with the
// app bar and toolbars enlarging at the same time
const { btnSize: largeBtnSize } = useLargeButtons();
const stepBtnSize = computed<"large" | "x-large">(() => largeBtnSize.value === "large" ? "x-large" : "large");

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

onBeforeUnmount(() => {
	// Auto-repeat timers + the debounce fire async writes against the modelValue ref; clearing
	// them stops the post-unmount writes that would otherwise hit a torn-down parent
	for (const handle of [debounceTimer, decreaseTimer, increaseTimer]) {
		if (handle !== null) {
			clearTimeout(handle);
		}
	}
	debounceTimer = decreaseTimer = increaseTimer = null;
});
</script>
