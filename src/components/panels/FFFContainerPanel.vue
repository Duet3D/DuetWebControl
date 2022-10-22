<template>
	<v-row :dense="$vuetify.breakpoint.mobile">
		<v-col cols="12" sm="6" md="4" lg="4" xl="4">
			<status-panel />
		</v-col>

		<v-col cols="12" sm="6" md="5" lg="5" xl="4">
			<tools-panel />
		</v-col>

		<v-col v-if="$vuetify.breakpoint.mdAndUp" :class="{ 'd-flex': hasTemperaturesToDisplay }" md="3" lg="3" xl="4">
			<temperature-chart />
		</v-col>
	</v-row>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		hasTemperaturesToDisplay(): boolean { return store.getters["machine/hasTemperaturesToDisplay"]; }
	}
});
</script>