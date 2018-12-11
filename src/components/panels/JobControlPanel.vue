<template>
	<v-card v-auto-size>
		<v-card-title>
			<v-icon small class="mr-1">build</v-icon> Job Control
		</v-card-title>

		<v-card-text class="py-0">
			<code-btn color="warning" block :disabled="frozen || !isPrinting" :code="this.isPaused ? 'M24' : 'M25'">
				<v-icon class="mr-1">{{ isPaused ? "play" : "pause" }}</v-icon> {{ isPaused ? "Resume Print" : "Pause Print" }}
			</code-btn>

			<code-btn v-if="!isPrinting && lastProcessedFile" color="success" block :code="processAnotherCode">
				<v-icon class="mr-1">refresh</v-icon> {{ this.state.mode === 'FFF' ? "Print Another" : "Process Another" }}
			</code-btn>

			<v-switch label="Enable Auto-Sleep" v-model="autoSleepActive" :disabled="frozen"></v-switch>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
	computed: {
		...mapGetters('ui', ['frozen']),
		...mapGetters('machine', ['isPrinting', 'isPaused']),
		...mapState('machine', ['autoSleep', 'lastProcessedFile', 'state']),
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
