<!-- Snapshot timings for the current (or last) job. Reads live OM fields while a job is active and
	 the lastXxx fields otherwise so the panel stays useful right after a job finishes -->
<template>
	<v-card>
		<v-card-title class="d-flex align-center pb-1">
			<v-icon size="small" class="mr-1">mdi-dots-horizontal</v-icon>
			{{ $t("panel.jobData.caption") }}
		</v-card-title>

		<v-card-text class="text-center pb-2">
			<v-row dense>
				<v-col class="d-flex flex-column">
					<strong>{{ $t("panel.jobData.warmUpDuration") }}</strong>
					<span>{{ displayTime(warmUpDuration) }}</span>
				</v-col>
				<v-col class="d-flex flex-column">
					<strong>{{ $t("panel.jobData.currentLayerTime") }}</strong>
					<span>{{ displayTime(layerTime) }}</span>
				</v-col>
				<v-col class="d-flex flex-column">
					<strong>{{ $t("panel.jobData.lastLayerTime") }}</strong>
					<span>{{ displayTime(lastLayerTime) }}</span>
				</v-col>
				<v-col class="d-flex flex-column">
					<strong>{{ $t("panel.jobData.jobDuration") }}</strong>
					<span>{{ displayTime(jobDuration) }}</span>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";
import { displayTime } from "@/utils/display";
import { isPrinting } from "@/utils/enums";

const machineStore = useMachineStore();

const running = computed(() => isPrinting(machineStore.model.state.status));

const warmUpDuration = computed(() => running.value
	? machineStore.model.job.warmUpDuration
	: machineStore.model.job.lastWarmUpDuration);

const layerTime = computed(() => machineStore.model.job.layerTime);

const lastLayerTime = computed(() => {
	const layers = machineStore.model.job.layers;
	return layers.length > 0 ? layers[layers.length - 1].duration : null;
});

const jobDuration = computed(() => running.value
	? machineStore.model.job.duration
	: machineStore.model.job.lastDuration);
</script>
