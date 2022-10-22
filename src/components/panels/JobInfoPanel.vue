<style scoped>
p {
	margin-bottom: 8px;
}
p:last-child {
	margin-bottom: 0;
}
</style>

<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">mdi-information</v-icon>
			{{ $t("panel.jobInfo.caption") }}
		</v-card-title>

		<v-card-text class="d-flex flex-column pt-0">
			<p>
				<strong>{{ $t("panel.jobInfo.height") }}</strong>
				{{ $displayZ(jobFile?.height) }}
			</p>
			<p v-if="isFFForUnset">
				<strong>{{ $t("panel.jobInfo.layerHeight") }}</strong>
				{{ $displayZ(jobFile?.layerHeight) }}
			</p>
			<p v-if="isFFForUnset">
				<strong>{{ $t("panel.jobInfo.filament") }}</strong>
				{{ $displayZ(jobFile?.filament) }}
			</p>
			<p>
				<strong>{{ $t("panel.jobInfo.generatedBy") }}</strong>
				{{ $display(jobFile?.generatedBy) }}
			</p>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { GCodeFileInfo, MachineMode } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		jobFile(): GCodeFileInfo | null { return store.state.machine.model.job.file; },
		isFFForUnset(): boolean { return !store.state.machine.model.state.machineMode || store.state.machine.model.state.machineMode === MachineMode.fff; }
	}
});
</script>
