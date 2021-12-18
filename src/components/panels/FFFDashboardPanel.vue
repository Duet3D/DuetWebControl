<template>
	<v-row :dense="$vuetify.breakpoint.mobile">
		<v-col cols="12" sm="8" md="8" lg="9" xl="9">
			<movement-panel class="mb-2"></movement-panel>

			<v-row v-if="isFFForUnset">
				<v-col sm="12" :md="(atxPower !== null) ? 9 : 12" :lg="(atxPower !== null) ? 9 : 12" :xl="(atxPower !== null) ? 10 : 12">
					<extrude-panel></extrude-panel>
				</v-col>

				<v-col v-if="atxPower !== null" md="3" lg="3" xl="2" align-self="center">
					<atx-panel></atx-panel>
				</v-col>
			</v-row>

			<v-row>
				<v-col sm="12" :md="showATXPanel ? 9 : 12" :lg="showATXPanel ? 9 : 12" :xl="showATXPanel ? 10 : 12">
					<fan-panel></fan-panel>
				</v-col>

				<v-col v-if="showATXPanel" md="3" lg="3" xl="2" align-self="center">
					<atx-panel></atx-panel>
				</v-col>
			</v-row>
		</v-col>

		<v-col class="hidden-xs-only" sm="4" md="4" lg="3" xl="3">
			<macro-list></macro-list>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

import { MachineMode } from '@/store/machine/modelEnums'

export default {
	computed: {
		...mapState('machine/model', {
			fans: state => state.state.fans,
			atxPower: state => state.state.atxPower,
			machineMode: state => state.state.machineMode
		}),
		...mapGetters(['uiFrozen']),
		...mapGetters('machine/model', ['currentTool']),
		isFFForUnset() {
			return !this.machineMode || (this.machineMode === MachineMode.fff);
		},
		showATXPanel() {
			return !this.isFFForUnset && this.atxPower !== null;
		},
		showFansPanel() {
			return (this.currentTool && this.currentTool.fans.length > 0) || this.fans.some(fan => fan && !fan.thermostatic.control);
		}
	}
}
</script>
