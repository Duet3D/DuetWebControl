<template>
	<v-row >
		<v-col cols="12" class="pt-0 pb-0" >
			<cnc-movement-panel class="mb-2"></cnc-movement-panel>
		</v-col>
			<v-row>
				<v-col sm="12" :md="!isFFForUnset && atxPower !== null ? 9 : 12" :lg="!isFFForUnset && atxPower !== null ? 9 : 12" :xl="!isFFForUnset && atxPower !== null ? 10 : 12">
					<fan-panel></fan-panel>
				</v-col>
			</v-row>
	</v-row>
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
