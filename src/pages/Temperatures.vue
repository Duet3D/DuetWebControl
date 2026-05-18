<route lang="json">
{
	"meta": {
		"menu": {
			"category": "control",
			"icon": "mdi-chart-line",
			"caption": "menu.control.temperatures",
			"order": 7,
			"conditionKey": "xsOrSm",
			"color": "teal"
		}
	}
}
</route>

<template>
	<div class="temperatures-page d-flex flex-column" :class="{ 'dwc-page-fill': hasData }">
		<TemperatureChart ref="chartRef" />
	</div>
</template>

<script setup lang="ts">
const TemperatureChart = defineAsyncComponent(() => import("@/components/charts/TemperatureChart.vue"));

const chartRef = ref<{ hasTemperaturesToDisplay: boolean } | null>(null);
const hasData = computed(() => chartRef.value?.hasTemperaturesToDisplay ?? false);
</script>

