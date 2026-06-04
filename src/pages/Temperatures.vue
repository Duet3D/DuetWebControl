<route lang="json">
{
	"meta": {
		"pageFill": true,
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
	<div class="temperatures-page d-flex flex-column" :class="{ 'dwc-page-fill': shouldFill }">
		<TemperatureChart ref="chartRef" />
	</div>
</template>

<script setup lang="ts">
import TemperatureChart from "@/components/charts/TemperatureChart.vue";

const chartRef = ref<{ shouldFill: boolean } | null>(null);
const shouldFill = computed(() => chartRef.value?.shouldFill ?? false);
</script>
