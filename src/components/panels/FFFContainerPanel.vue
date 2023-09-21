<template>
	<v-row :dense="$vuetify.display.mobile">
		<v-col cols="12" sm="6" md="4" lg="4" xl="4">
			<status-panel />
		</v-col>

		<v-col cols="12" sm="6" md="5" lg="5" xl="4">
			<tools-panel />
		</v-col>

		<v-col v-if="$vuetify.display.mdAndUp" :class="{ 'd-flex': hasTemperaturesToDisplay }" md="3" lg="3" xl="4">
			<temperature-chart />
		</v-col>
	</v-row>
</template>

<script lang="ts">
import { mapState } from "pinia";
import { defineComponent } from "vue";

import { useUiStore } from "@/store/ui";

export default defineComponent({
	computed: mapState(useUiStore, ["hasTemperaturesToDisplay"])
});
</script>