<template>
	<v-row :dense="$vuetify.breakpoint.mobile">
		<v-col cols="12" sm="8" md="8" lg="9" xl="9">
			<movement-panel class="mb-2" />

			<v-row v-if="isFFF">
				<v-col sm="12" :md="showATXPanel ? 9 : 12" :lg="showATXPanel ? 9 : 12" :xl="showATXPanel ? 10 : 12">
					<extrude-panel />
				</v-col>

				<v-col v-if="showATXPanel" md="3" lg="3" xl="2" align-self="center">
					<atx-panel />
				</v-col>
			</v-row>

			<v-row>
				<v-col sm="12" :md="!isFFF && showATXPanel ? 9 : 12" :lg="!isFFF && showATXPanel ? 9 : 12"
					   :xl="!isFFF && showATXPanel ? 10 : 12">
					<fan-panel />
				</v-col>

				<v-col v-if="!isFFF && showATXPanel" md="3" lg="3" xl="2" align-self="center">
					<atx-panel />
				</v-col>
			</v-row>
		</v-col>

		<v-col class="hidden-xs-only" sm="4" md="4" lg="3" xl="3">
			<macro-list />
		</v-col>
	</v-row>
</template>

<script lang="ts">
import { mapState } from "pinia";
import Vue from "vue";

import { useMachineStore } from "@/store/machine";
import { useUiStore } from "@/store/ui";

export default Vue.extend({
	computed: {
		...mapState(useUiStore, ["isFFF", "uiFrozen"]),
		...mapState(useMachineStore, {
			currentTool: state => state.currentTool,
			showATXPanel: state => state.model.state.atxPower !== null,
			showFansPanel: state => ((state.currentTool !== null) && (state.currentTool.fans.length > 0)) ||
									state.model.fans.some(fan => (fan !== null) && (fan.thermostatic.sensors.length === 0))
		})
	}
});
</script>
