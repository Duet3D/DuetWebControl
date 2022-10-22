<template>
	<v-row :dense="$vuetify.breakpoint.mobile">
		<v-col cols="12" sm="8" md="8" lg="9" xl="9">
			<movement-panel class="mb-2" />

			<v-row v-if="isFFForUnset">
				<v-col sm="12" :md="showATXPanel ? 9 : 12" :lg="showATXPanel ? 9 : 12" :xl="showATXPanel ? 10 : 12">
					<extrude-panel />
				</v-col>

				<v-col v-if="showATXPanel" md="3" lg="3" xl="2" align-self="center">
					<atx-panel />
				</v-col>
			</v-row>

			<v-row>
				<v-col sm="12" :md="!isFFForUnset && showATXPanel ? 9 : 12" :lg="!isFFForUnset && showATXPanel ? 9 : 12"
					   :xl="!isFFForUnset && showATXPanel ? 10 : 12">
					<fan-panel />
				</v-col>

				<v-col v-if="!isFFForUnset && showATXPanel" md="3" lg="3" xl="2" align-self="center">
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
import { MachineMode, Tool } from '@duet3d/objectmodel';
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		currentTool(): Tool | null { return store.getters["machine/model/currentTool"]; },
		isFFForUnset(): boolean {
			return !store.state.machine.model.state.machineMode || (store.state.machine.model.state.machineMode === MachineMode.fff);
		},
		showATXPanel(): boolean {
			return (store.state.machine.model.state.atxPower !== null);
		},
		showFansPanel(): boolean {
			return ((this.currentTool !== null) && (this.currentTool.fans.length > 0)) ||
				store.state.machine.model.fans.some(fan => (fan !== null) && (fan.thermostatic.heaters.length === 0));
		}
	}
});
</script>
