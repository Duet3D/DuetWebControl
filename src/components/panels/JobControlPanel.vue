<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">build</v-icon> Job Control
		</v-card-title>

		<v-card-text class="py-0">
			<code-btn color="warning" block :disabled="uiFrozen || !isPrinting" :code="this.isPaused ? 'M24' : 'M25'">
				<v-icon class="mr-1">{{ isPaused ? "play_arrow" : "pause" }}</v-icon> {{ isPaused ? "Resume Print" : "Pause Print" }}
			</code-btn>

			<code-btn v-if="isPaused" color="error" block code="M0 H1">
				<v-icon class="mr-1">stop</v-icon> {{ this.state.mode === 'FFF' ? 'Cancel Print' : 'Cancel Job' }}
			</code-btn>

			<code-btn v-if="!isPrinting && lastProcessedFile" color="success" block :code="processAnotherCode">
				<v-icon class="mr-1">refresh</v-icon> {{ this.state.mode === 'FFF' ? "Print Another" : "Process Another" }}
			</code-btn>

			<v-switch label="Enable Auto-Sleep" v-model="autoSleepActive" :disabled="uiFrozen"></v-switch>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine', ['autoSleep', 'lastProcessedFile']),
		...mapState('machine/model', ['state']),
		...mapGetters('machine/model', ['isPrinting', 'isPaused']),
		autoSleepActive: {
			get() { return this.autoSleep; },
			set(value) { this.setAutoSleep(value) }
		},
		processAnotherCode() {
			return this.lastProcessedFile ? `M32 "${this.lastProcessedFile}"` : undefined;
		}
	},
	methods: mapMutations('machine', ['setAutoSleep'])
}
</script>
