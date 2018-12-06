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
		...mapState('machine', ['state']),
		status() {
			switch (this.state.status) {
				case 'F': return 'updating';
				case 'O': return 'off';
				case 'H': return 'halted';
				case 'D': return 'pausing';
				case 'S': return 'paused';
				case 'R': return 'resuming';
				case 'P': return (this.state.mode === 'FFF') ? 'printing' : 'processing';
				case 'M': return 'simulating';
				case 'B': return 'busy';
				case 'T': return 'changingTool';
				case 'I': return 'idle';
			}
			return 'unknown';
		},
		statusText() {
			return this.$t(`generic.status.${this.status}`);
		},
		statusClass() {
			switch (this.state.status) {
				case 'F': return 'blue lighten-3';
				case 'O': return 'red darken-1 white--text';
				case 'H': return 'red white--text';
				case 'D': return 'orange accent-2';
				case 'S': return 'yellow lighten-1';
				case 'R': return 'orange accent-2';
				case 'P': return 'green white--text';
				case 'M': return 'light-blue accent-3';
				case 'B': return 'amber white--text';
				case 'T': return 'light-blue';
				case 'I': return 'light-green lighten-4';
			}
			return 'unknown';
		}
	}
}
</script>
