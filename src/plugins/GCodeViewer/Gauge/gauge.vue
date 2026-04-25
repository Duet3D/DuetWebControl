<!-- Thin Vue wrapper around the d3-based Gauge class used by the FSOverlay temperature
	 readouts. Owns its DOM container, recreates the underlying gauge on mount and re-renders
	 on prop changes (current value, target temperature, state, scale max) -->
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

function refresh() {
	if (!gauge) return;
	gauge.max = props.max;
	gauge.setTemperature = props.settemp;
	gauge.update(props.curval);
	gauge.updateState(props.state ?? "");
}

onMounted(() => {
	if (!gaugeContainer.value) return;
	gauge = new Gauge(gaugeContainer.value);
	refresh();
	// The container can briefly report a 0x0 size before Vuetify finishes its layout pass;
	// a second draw after 200 ms picks up the correct dimensions
	setTimeout(refresh, 200);
});

watch(() => [props.max, props.curval, props.settemp, props.state], () => refresh());
</script>

<style scoped>
.center-label {
	text-align: center;
}
</style>
