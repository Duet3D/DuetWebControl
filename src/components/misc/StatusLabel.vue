<style scoped>
span {
	border-radius: 5px;
}
</style>

<template>
	<span class="px-2 subtitle-2" :class="statusClass">
		{{ statusText }}
	</span>
</template>

<script>
'use strict'

import { MachineMode, MachineStatus } from '@duet3d/objectmodel'
import { mapState } from 'vuex'

export default {
	computed: {
		...mapState('machine/model', ['state']),
		...mapState('settings', ['darkTheme']),
		statusText() {
			let type = this.state.status;
			if (!this.state.status) {
				type = 'unknown';
			} else if (this.state.status === MachineStatus.processing && this.state.machineMode === MachineMode.fff) {
				type = 'printing';
			}
			return this.$t(`generic.status.${type}`);
		},
		statusClass() {
			switch (this.state.status) {
				case MachineStatus.disconnected: return this.darkTheme ? 'red darken-2 white--text' : 'red darken-1 white--text';
				case MachineStatus.starting: return this.darkTheme ? 'light-blue darken-3' : 'light-blue accent-1';
				case MachineStatus.updating: return this.darkTheme ? 'blue darken-3' : 'blue lighten-3';
				case MachineStatus.off: return this.darkTheme ? 'red darken-2 white--text' : 'red darken-1 white--text';
				case MachineStatus.halted: return 'red white--text';
				case MachineStatus.pausing: return this.darkTheme ? 'yellow darken-3' : 'orange accent-2';
				case MachineStatus.paused: return this.darkTheme ? 'orange darken-2' : 'yellow lighten-1';
				case MachineStatus.resuming: return this.darkTheme ? 'yellow darken-3' : 'orange accent-2';
				case MachineStatus.processing: return 'green white--text';
				case MachineStatus.simulating: return this.darkTheme ? 'light-blue darken-3' : 'light-blue accent-1';
				case MachineStatus.busy: return this.darkTheme ? 'amber darken-2 white--text' : 'amber white--text';
				case MachineStatus.changingTool: return this.darkTheme ? 'grey darken-3' : 'blue lighten-5';
				case MachineStatus.idle: return this.darkTheme ? 'light-green darken-3' : 'light-green lighten-4';
				default: return 'red white--text';
			}
		}
	}
}
</script>
