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

import { mapState } from 'vuex'

import { MachineMode, StatusType } from '../../store/machine/modelEnums.js'

export default {
	computed: {
		...mapState('machine/model', ['state']),
		...mapState('settings', ['darkTheme']),
		statusText() {
			let type = this.state.status;
			if (!this.state.status) {
				type = 'unknown';
			} else if (this.state.status === StatusType.processing && this.state.machineMode === MachineMode.fff) {
				type = 'printing';
			}
			return this.$t(`generic.status.${type}`);
		},
		statusClass() {
			switch (this.state.status) {
				case StatusType.disconnected: return this.darkTheme ? 'red darken-2 white--text' : 'red darken-1 white--text';
				case StatusType.starting: return this.darkTheme ? 'light-blue darken-3' : 'light-blue accent-1';
				case StatusType.updating: return this.darkTheme ? 'blue darken-3' : 'blue lighten-3';
				case StatusType.off: return this.darkTheme ? 'red darken-2 white--text' : 'red darken-1 white--text';
				case StatusType.halted: return 'red white--text';
				case StatusType.pausing: return this.darkTheme ? 'yellow darken-3' : 'orange accent-2';
				case StatusType.paused: return this.darkTheme ? 'orange darken-2' : 'yellow lighten-1';
				case StatusType.resuming: return this.darkTheme ? 'yellow darken-3' : 'orange accent-2';
				case StatusType.processing: return 'green white--text';
				case StatusType.simulating: return this.darkTheme ? 'light-blue darken-3' : 'light-blue accent-1';
				case StatusType.busy: return this.darkTheme ? 'amber darken-2 white--text' : 'amber white--text';
				case StatusType.changingTool: return this.darkTheme ? 'grey darken-3' : 'blue lighten-5';
				case StatusType.idle: return this.darkTheme ? 'light-green darken-3' : 'light-green lighten-4';
				default: return 'red white--text';
			}
		}
	}
}
</script>
