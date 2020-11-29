<template>
	<div>
		<template v-if="isFFForUnset">
			<fff-dashboard-panel></fff-dashboard-panel>
		</template>
		<template v-else>
			<cnc-dashboard-panel></cnc-dashboard-panel>
		</template>
	</div>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

import { registerRoute } from '..'
import { MachineMode } from '../../store/machine/modelEnums.js'

export default {
	computed: {
		...mapState('machine/model', {
			atxPower: state => state.state.atxPower,
			machineMode: state => state.state.machineMode
		}),
		isFFForUnset() {
			return !this.machineMode || (this.machineMode === MachineMode.fff);
		}
	},
	install() {
		// Register a route via Control -> Dashboard
		registerRoute(this, {
			Control: {
				Dashboard: {
					icon: 'mdi-view-dashboard',
					caption: 'menu.control.dashboard',
					path: '/'
				}
			}
		});
	}
}
</script>
