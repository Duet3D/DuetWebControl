<template>
	<div>
		<v-row>
			<v-col cols="12" class="pt-0 pb-0">
				<cnc-movement-panel class="mb-2"></cnc-movement-panel>
			</v-col>
			<v-col cols="12">
				<job-progress></job-progress>
			</v-col>
		</v-row>
		<v-row>
			<v-col cols="4" class="flex-grow-1">
				<job-control-panel></job-control-panel>
			</v-col>
			<v-col cols="4" class="flex-grow-1">
				<z-babystep-panel></z-babystep-panel>
			</v-col>
			<v-col cols="4" class="flex-grow-1">
				<speed-factor-panel></speed-factor-panel>
			</v-col>
		</v-row>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import { MachineMode } from '../../store/machine/modelEnums.js';

export default {
	computed: {
		...mapState('machine/model', {
			atxPower: state => state.state.atxPower,
			machineMode: state => state.state.machineMode,
		}),
		isFFForUnset() {
			return !this.machineMode || this.machineMode === MachineMode.fff;
		},
	},
};
</script>
