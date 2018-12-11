<template>
	<base-grid>
		<dynamic-grid-item :md="[0, 0, 24, 2]">
			<job-progress></job-progress>
		</dynamic-grid-item>
		<dynamic-grid-item :md="[0, 2, 4, 6]">
			<job-control-panel></job-control-panel>
		</dynamic-grid-item>
		<dynamic-grid-item :md="[0, 8, 4, 6]">
			<babystepping-panel></babystepping-panel>
		</dynamic-grid-item>
		<dynamic-grid-item :md="[0, 14, 4, 9]">
			<job-info-panel></job-info-panel>
		</dynamic-grid-item>
		<dynamic-grid-item :md="[4, 2, 14, 12]">
			<layer-chart></layer-chart>
		</dynamic-grid-item>
		<dynamic-grid-item :md="[4, 14, 14, 4]">
			<job-data-panel></job-data-panel>
		</dynamic-grid-item>
		<dynamic-grid-item :md="[4, 18, 14, 4]">
			<job-estimations-panel></job-estimations-panel>
		</dynamic-grid-item>
		<dynamic-grid-item :md="[18, 2, 6, 7]">
			<fans-panel></fans-panel>
		</dynamic-grid-item>
		<dynamic-grid-item :md="[18, 9, 6, 6]">
			<speed-factor-panel></speed-factor-panel>
		</dynamic-grid-item>
		<dynamic-grid-item :md="[18, 16, 6, 12]">
			<extrusion-factors-panel></extrusion-factors-panel>
		</dynamic-grid-item>
	</base-grid>
</template>
