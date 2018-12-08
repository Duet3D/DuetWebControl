<template>
	<base-page>
		<dynamic-grid-item :xs="[0, 0, 24, 9]" :sm="[0, 0, 24, 9]" :md="[0, 0, 18, 9]">
			<movement-panel></movement-panel>
		</dynamic-grid-item>

		<dynamic-grid-item :xs="[0, 9, 24, 6]" :md="[0, 9, 18, 6]">
			<extrude-panel></extrude-panel>
		</dynamic-grid-item>

		<dynamic-grid-item :md="[18, 0, 6, 12]">
			<macro-list></macro-list>
		</dynamic-grid-item>

		<dynamic-grid-item :md="[0, 15, 15, 6]">
			<fan-panel></fan-panel>
		</dynamic-grid-item>

		<dynamic-grid-item :md="[15, 15, 3, 6]">
			<atx-panel></atx-panel>
		</dynamic-grid-item>
	</base-page>
</template>

<script>
'use strict'

export default {

}
</script>
