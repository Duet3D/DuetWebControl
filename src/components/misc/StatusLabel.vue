<style scoped>
span {
	border-radius: 5px;
}
</style>

<template>
	<span class="px-2" :class="statusClass">{{ statusText }}</span>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

export default {
	computed: {
		...mapState('machine/model', ['state']),
		...mapState('settings', ['darkTheme']),
		statusType() {
			if (!this.state.status) {
				return 'unknown';
			}
			if (this.state.status === 'processing' && this.state.mode === 'FFF') {
				return 'printing';
			}
			return this.state.status;
		},
		statusText() {
			return this.$t(`generic.status.${this.statusType}`);
		},
		statusClass() {
			switch (this.state.status) {
				case 'updating': return this.darkTheme ? 'blue darken-3' : 'blue lighten-3';
				case 'off': return this.darkTheme ? 'red darken-2 white--text' : 'red darken-1 white--text';
				case 'halted': return 'red white--text';
				case 'pausing': return this.darkTheme ? 'yellow darken-3' : 'orange accent-2';
				case 'paused': return this.darkTheme ? 'orange darken-2' : 'yellow lighten-1';
				case 'resuming': return this.darkTheme ? 'yellow darken-3' : 'orange accent-2';
				case 'processing': return 'green white--text';
				case 'simulating': return this.darkTheme ? 'light-blue darken-3' : 'light-blue accent-3';
				case 'busy': return this.darkTheme ? 'amber darken-2 white--text' : 'amber white--text';
				case 'changingTool': return this.darkTheme ? 'light-blue darken-2' : 'light-blue';
				case 'idle': return this.darkTheme ? 'light-green darken-3' : 'light-green lighten-4';
			}
			return 'red white--text';
		}
	}
}
</script>
