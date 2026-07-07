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
	<div class="temperatures-page d-flex flex-column dwc-page-fill">
		<TemperatureChart />
	</div>
</template>

<script setup lang="ts">
import TemperatureChart from "@/components/charts/TemperatureChart.vue";
</script>
