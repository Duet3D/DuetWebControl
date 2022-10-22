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

				<v-col v-if="timesLeft.layer !== null" class="d-flex flex-column">
					<strong>
						{{ $t("panel.jobEstimations.layer") }}
					</strong>
					<span>
						{{ $displayTime(timesLeft.layer) }}
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

import store from "@/store";
import { isPrinting } from "@/utils/enums";

export default Vue.extend({
	computed: {
		isPrinting(): boolean { return isPrinting(store.state.machine.model.state.status); },
		timesLeft(): TimesLeft { return store.state.machine.model.job.timesLeft; },
		slicerTimeLeft(): number | null {
			if (store.state.machine.model.job.timesLeft.slicer !== null) {
				return store.state.machine.model.job.timesLeft.slicer;
			}
			if (store.state.machine.model.job.file !== null && store.state.machine.model.job.duration !== null && store.state.machine.model.job.file.printTime != null) {
				return this.isPrinting ? Math.max(0, (store.state.machine.model.job.file.printTime as number) - store.state.machine.model.job.duration) : store.state.machine.model.job.file.printTime as number;
			}
			return null;
		},
		simulationTime(): number | null {
			if (!this.isSimulating && store.state.machine.model.job.file !== null && store.state.machine.model.job.file.simulatedTime !== null && store.state.machine.model.job.duration != null) {
				return this.isPrinting ? Math.max(0, (store.state.machine.model.job.file.simulatedTime as number) - store.state.machine.model.job.duration) : store.state.machine.model.job.file.simulatedTime as number;
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
		this.isSimulating = (store.state.machine.model.state.status === MachineStatus.simulating);
	},
	watch: {
		isPrinting(to: boolean) {
			if (to) {
				this.isSimulating = (store.state.machine.model.state.status === MachineStatus.simulating);
			} else {
				this.isSimulating = false;
			}
		}
	}
});
</script>
