<!-- Static job metadata pulled from the file header: total height, layer height, filament use and
	 the slicer/generator string. FFF-only fields are hidden when the machine is in CNC mode -->
<template>
	<v-card>
		<v-card-title class="d-flex align-center">
			<v-icon size="small" class="mr-1">mdi-information</v-icon>
			{{ $t("panel.jobInfo.caption") }}
		</v-card-title>

		<v-card-text class="d-flex flex-column pt-0">
			<p>
				<strong>{{ $t("panel.jobInfo.height") }}</strong>
				{{ displayZ(jobFile?.height) }}
			</p>
			<p v-if="isFFForUnset">
				<strong>{{ $t("panel.jobInfo.layerHeight") }}</strong>
				{{ displayZ(jobFile?.layerHeight) }}
			</p>
			<p v-if="isFFForUnset">
				<strong>{{ $t("panel.jobInfo.filament") }}</strong>
				{{ displayZ(jobFile?.filament) }}
			</p>
			<p>
				<strong>{{ $t("panel.jobInfo.generatedBy") }}</strong>
				{{ display(jobFile?.generatedBy) }}
			</p>
		</v-card-text>
	</v-card>
</template>

<style scoped>
p {
	margin-bottom: 8px;
}
p:last-child {
	margin-bottom: 0;
}
</style>

<script setup lang="ts">
import { MachineMode } from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";
import { display, displayZ } from "@/utils/display";

const machineStore = useMachineStore();

const jobFile = computed(() => machineStore.model.job.file);
const isFFForUnset = computed(() => !machineStore.model.state.machineMode
	|| machineStore.model.state.machineMode === MachineMode.fff);
</script>
