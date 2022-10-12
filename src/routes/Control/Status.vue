<template>
	<div class="mb-3">
		<fff-container-panel v-if="isFFForUnset"></fff-container-panel>
		<cnc-container-panel v-else></cnc-container-panel>
	</div>
</template>

<script>
'use strict'

import { MachineMode } from '@duet3d/objectmodel';
import Vue from 'vue'
import { mapState } from 'vuex'

import { registerRoute } from '@/routes'
import { DashboardMode } from '@/store/settings'

export default {
	install() {
		// Register a route via Control -> Status
		registerRoute(this, {
			Control: {
				Console: {
					icon: 'mdi-list-status',
					caption: 'menu.control.status',
					condition: () => Vue.prototype.$vuetify && Vue.prototype.$vuetify.breakpoint.smAndDown,
					path: '/Status'
				}
			}
		});
	},

	computed: {
		...mapState('machine/model', {
			machineMode: state => state.state.machineMode
		}),
		...mapState('settings', ['dashboardMode']),
		isFFForUnset() {
			if (this.dashboardMode === DashboardMode.default) {
				return !this.machineMode || this.machineMode === MachineMode.fff;
			}
			return this.dashboardMode === DashboardMode.fff;
		}
	}
}
</script>