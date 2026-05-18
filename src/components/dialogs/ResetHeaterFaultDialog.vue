<template>
	<v-dialog v-model="shown" max-width="360">
		<v-card>
			<v-card-title>
				<v-icon class="mr-1">mdi-alert</v-icon> {{ $t("dialog.resetHeaterFault.title") }}
			</v-card-title>

			<v-card-text>
				{{ $t("dialog.resetHeaterFault.prompt", [heater]) }}
			</v-card-text>

			<v-card-actions>
				<v-spacer />

				<v-btn color="blue-darken-1" variant="text" :disabled="counter > 0" @click="resetFault">
					{{ $t("dialog.resetHeaterFault.resetFault") + (counter > 0 ? ` (${counter})` : "") }}
				</v-btn>

				<v-btn color="blue-darken-1" variant="text" @click="hide">
					{{ $t("generic.cancel") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";

const countdownSeconds = 5;

const props = defineProps<{
	heater: number;
}>();

const shown = defineModel<boolean>("shown", { required: true });
const machineStore = useMachineStore();

const counter = ref(countdownSeconds);
const resetHeaters = ref<Array<number>>([]);
let timer: ReturnType<typeof setTimeout> | null = null;

function countDown() {
	counter.value--;
	timer = (counter.value > 0) ? setTimeout(countDown, 1000) : null;
}

async function resetFault() {
	try {
		await machineStore.sendCode(`M562 P${props.heater}`);
		resetHeaters.value.push(props.heater);
	} finally {
		hide();
	}
}

function hide() {
	shown.value = false;
}

watch(shown, (to) => {
	if (to) {
		if (!timer && !resetHeaters.value.includes(props.heater)) {
			counter.value = countdownSeconds;
			countDown();
		}
	} else if (timer) {
		clearTimeout(timer);
		timer = null;
	}
});

onBeforeUnmount(() => {
	// The watcher only clears the timer when shown flips to false; if the parent unmounts the
	// dialog while it's still open, the countdown keeps firing against a dead counter ref
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
});
</script>
