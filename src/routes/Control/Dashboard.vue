<template>
	<div class="mb-3">
		<fff-dashboard-panel v-if="isFFForUnset"></fff-dashboard-panel>
		<cnc-dashboard-panel v-else></cnc-dashboard-panel>
	</div>
</template>

<script>
'use strict';

import { mapState } from 'vuex';

import { registerRoute } from '..'
import { DashboardMode } from '../../store/settings.js'
import { MachineMode } from '../../store/machine/modelEnums.js'

export default {
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
    },

	computed: {
		...mapState('machine/model', {
			atxPower: state => state.state.atxPower,
			machineMode: state => state.state.machineMode
		}),
		...mapState('settings', ['dashboardMode']),
		isFFForUnset() {
			if (this.dashboardMode === DashboardMode.default) {
				return !this.machineMode || this.machineMode === MachineMode.fff;
			}
			return this.dashboardMode === DashboardMode.fff;
		},
	},
};
</script>
