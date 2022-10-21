<template>
	<div class="mb-3">
		<fff-container-panel v-if="isFFForUnset" />
		<cnc-container-panel v-else />
	</div>
</template>

<script lang="ts">
import { MachineMode } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";
import { DashboardMode } from "@/store/settings";

export default Vue.extend({
	computed: {
		isFFForUnset() {
			if (store.state.settings.dashboardMode === DashboardMode.default) {
				return !store.state.machine.model.state.machineMode || store.state.machine.model.state.machineMode === MachineMode.fff;
			}
			return store.state.settings.dashboardMode === DashboardMode.fff;
		}
	}
});
</script>