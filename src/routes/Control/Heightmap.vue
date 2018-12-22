<style>
.no-heightmap-margin {
	margin-left: 0 !important;
	margin-right: 0 !important;
}
.no-heightmap-margin > .card {
	margin-left: 0 !important;
	margin-right: 0 !important;
}
.no-heightmap-margin .heightmap-container {
	padding: 0 !important;
}
</style>

<template>
	<v-layout column full-height>
		<v-flex d-block>
			<heightmap-panel :class="{ 'no-heightmap-margin' : $vuetify.breakpoint.xsOnly }"></heightmap-panel>
		</v-flex>
	</v-layout>
</template>
