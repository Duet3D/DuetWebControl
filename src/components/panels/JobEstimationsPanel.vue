<!-- Time-remaining estimates pulled from RRF's timesLeft block plus slicer/simulation derived values.
	 The simulating-state latch mirrors JobControlPanel - once a sim is cancelled the OM no longer says
	 "simulating", but we still want to show the simulation column instead of swapping it out -->
<template>
	<v-card>
		<v-card-title class="d-flex align-center pb-1">
			<v-icon size="small" class="mr-1">mdi-clock</v-icon>
			{{ $t("panel.jobEstimations.caption") }}
		</v-card-title>

		<v-card-text class="text-center pb-2">
			<v-row dense>
				<v-col v-if="timesLeft.filament !== null" class="d-flex flex-column">
					<strong>{{ $t("panel.jobEstimations.filament") }}</strong>
					<span>{{ displayTime(timesLeft.filament) }}</span>
				</v-col>
				<v-col class="d-flex flex-column">
					<strong>{{ $t("panel.jobEstimations.file") }}</strong>
					<span>{{ displayTime(timesLeft.file) }}</span>
				</v-col>
				<v-col v-if="slicerTimeLeft !== null" class="d-flex flex-column">
					<strong>{{ $t("panel.jobEstimations.slicer") }}</strong>
					<span>{{ displayTime(slicerTimeLeft) }}</span>
				</v-col>
				<v-col v-if="timesLeft.toPause !== null" class="d-flex flex-column">
					<strong>{{ $t("panel.jobEstimations.toPause") }}</strong>
					<span>{{ displayTime(timesLeft.toPause) }}</span>
				</v-col>
				<v-col v-if="simulationTime !== null" class="d-flex flex-column">
					<strong>{{ $t("panel.jobEstimations.simulation") }}</strong>
					<span>{{ displayTime(simulationTime) }}</span>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { MachineStatus, TimesLeft } from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";
import { displayTime } from "@/utils/display";
import { isPrinting as isPrintingEnum } from "@/utils/enums";

const machineStore = useMachineStore();

const isSimulating = ref(false);

const isPrinting = computed(() => isPrintingEnum(machineStore.model.state.status));
const timesLeft = computed<TimesLeft>(() => machineStore.model.job.timesLeft);

const slicerTimeLeft = computed(() => {
	const job = machineStore.model.job;
	if (job.timesLeft.slicer !== null) {
		return job.timesLeft.slicer;
	}
	if (job.file !== null && job.duration !== null && job.file.printTime !== null) {
		return isPrinting.value
			? Math.max(0, (job.file.printTime as number) - job.duration)
			: job.file.printTime as number;
	}
	return null;
});

const simulationTime = computed(() => {
	const job = machineStore.model.job;
	if (!isSimulating.value && job.file !== null && job.file.simulatedTime !== null && job.duration !== null) {
		return isPrinting.value
			? Math.max(0, (job.file.simulatedTime as number) - job.duration)
			: job.file.simulatedTime as number;
	}
	return null;
});

onMounted(() => {
	isSimulating.value = machineStore.model.state.status === MachineStatus.simulating;
});

watch(isPrinting, (to) => {
	if (to) {
		isSimulating.value = machineStore.model.state.status === MachineStatus.simulating;
	} else {
		isSimulating.value = false;
	}
});
</script>
