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
				case 'updating': return 'blue lighten-3';
				case 'off': return 'red darken-1 white--text';
				case 'halted': return 'red white--text';
				case 'pausing': return 'orange accent-2';
				case 'paused': return 'yellow lighten-1';
				case 'resuming': return 'orange accent-2';
				case 'processing': return 'green white--text';
				case 'simulating': return 'light-blue accent-3';
				case 'busy': return 'amber white--text';
				case 'changingTool': return 'light-blue';
				case 'idle': return 'light-green lighten-4';
			}
			return 'red white--text';
		}
	}
}
</script>
