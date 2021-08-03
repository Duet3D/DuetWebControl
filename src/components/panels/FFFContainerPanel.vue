<template>
	<v-row>
		<v-col cols="12" sm="6" md="4" lg="4" xl="4">
			<status-panel></status-panel>
		</v-col>

		<v-col cols="12" sm="6" md="5" lg="5" xl="4">
			<tools-panel></tools-panel>
		</v-col>

		<v-col v-if="$vuetify.breakpoint.mdAndUp" :class="{ 'd-flex': hasTemperaturesToDisplay }" md="3" lg="3" xl="4">
			<temperature-chart></temperature-chart>
		</v-col>
	</v-row>
</template>

<script>
import { mapGetters } from 'vuex';
export default {
	computed: {
		...mapGetters('machine', ['hasTemperaturesToDisplay']),
	},
};
</script>

<style>
</style>