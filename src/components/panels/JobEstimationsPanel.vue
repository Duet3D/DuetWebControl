<template>
	<v-card>
		<v-card-title class="pb-1">
			<v-icon small class="mr-1">mdi-clock</v-icon>
			{{ $t("panel.jobEstimations.caption") }}
		</v-card-title>

		<v-card-text class="text-center pb-2">
			<v-row dense>
				<v-col v-if="timesLeft.filament !== null" class="d-flex flex-column">
					<strong>
						{{ $t("panel.jobEstimations.filament") }}
					</strong>
					<span>
						{{ $displayTime(timesLeft.filament) }}
					</span>
				</v-col>

				<v-col class="d-flex flex-column">
					<strong>
						{{ $t("panel.jobEstimations.file") }}
					</strong>
					<span>
						{{ $displayTime(timesLeft.file) }}
					</span>
				</v-col>

				<v-col v-if="slicerTimeLeft !== null" class="d-flex flex-column">
					<strong>
						{{ $t("panel.jobEstimations.slicer") }}
					</strong>
					<span>
						{{ $displayTime(slicerTimeLeft) }}
					</span>
				</v-col>

				<v-col v-if="simulationTime !== null" class="d-flex flex-column">
					<strong>
						{{ $t("panel.jobEstimations.simulation") }}
					</strong>
					<span>
						{{ $displayTime(simulationTime) }}
					</span>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { MachineStatus, TimesLeft } from "@duet3d/objectmodel";
import Vue from "vue";

import { useMachineStore } from "@/store/machine";
import { isPrinting } from "@/utils/enums";

export default Vue.extend({
	computed: {
		isPrinting(): boolean { return isPrinting(useMachineStore().model.state.status); },
		timesLeft(): TimesLeft { return useMachineStore().model.job.timesLeft; },
		slicerTimeLeft(): number | null {
			const machineStore = useMachineStore();
			if (machineStore.model.job.timesLeft.slicer !== null) {
				return machineStore.model.job.timesLeft.slicer;
			}
			if (machineStore.model.job.file !== null && machineStore.model.job.duration !== null && machineStore.model.job.file.printTime != null) {
				return this.isPrinting ? Math.max(0, (machineStore.model.job.file.printTime as number) - machineStore.model.job.duration) : machineStore.model.job.file.printTime as number;
			}
			return null;
		},
		simulationTime(): number | null {
			const machineStore = useMachineStore();
			if (!this.isSimulating && machineStore.model.job.file !== null && machineStore.model.job.file.simulatedTime !== null && machineStore.model.job.duration != null) {
				return this.isPrinting ? Math.max(0, (machineStore.model.job.file.simulatedTime as number) - machineStore.model.job.duration) : machineStore.model.job.file.simulatedTime as number;
			}
			return null;
		}
	},
	data() {
		return {
			isSimulating: false
		}
	},
	mounted() {
		this.isSimulating = (useMachineStore().model.state.status === MachineStatus.simulating);
	},
	watch: {
		isPrinting(to: boolean) {
			if (to) {
				this.isSimulating = (useMachineStore().model.state.status === MachineStatus.simulating);
			} else {
				this.isSimulating = false;
			}
		}
	}
});
</script>
