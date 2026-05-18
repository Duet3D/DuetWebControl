<template>
	<div>
		<div class="center-label">{{ label }}</div>
		<div ref="gaugeContainer" class="gaugeContainer" />
	</div>
</template>

<script setup lang="ts">
import Gauge from "./gauge";

const props = defineProps<{
	label?: string;
	max: number;
	curval: number;
	settemp: number;
	state?: string;
}>();

const gaugeContainer = ref<HTMLElement | null>(null);
let gauge: Gauge | undefined;
let settleTimer: ReturnType<typeof setTimeout> | null = null;

function refresh() {
	if (!gauge) {
		return;
	}
	gauge.max = props.max;
	gauge.setTemperature = props.settemp;
	gauge.update(props.curval);
	gauge.updateState(props.state ?? "");
}

onMounted(() => {
	if (!gaugeContainer.value) {
		return;
	}
	gauge = new Gauge(gaugeContainer.value);
	refresh();
	// The container can briefly report a 0x0 size before Vuetify finishes its layout pass; a
	// second draw after 200 ms picks up the correct dimensions. Tracked so we can cancel it on
	// unmount and avoid drawing through a disposed Gauge instance
	settleTimer = setTimeout(() => {
		settleTimer = null;
		refresh();
	}, 200);
});

onBeforeUnmount(() => {
	if (settleTimer !== null) {
		clearTimeout(settleTimer);
		settleTimer = null;
	}
	gauge = undefined;
});

watch(() => [props.max, props.curval, props.settemp, props.state], () => refresh());
</script>

<style scoped>
.center-label {
	text-align: center;
}
</style>
