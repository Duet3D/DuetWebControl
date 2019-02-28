<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">build</v-icon> {{ $t('panel.jobControl.caption') }}
		</v-card-title>

		<v-card-text class="pt-0">
			<code-btn color="warning" block :disabled="uiFrozen || !state.isPrinting" :code="this.isPaused ? 'M24' : 'M25'" tabindex="0">
				<v-icon class="mr-1">{{ isPaused ? "play_arrow" : "pause" }}</v-icon> {{ pauseResumeText }}
			</code-btn>

			<code-btn v-if="isPaused" color="error" block code="M0 H1">
				<v-icon class="mr-1">stop</v-icon> {{ cancelText }}
			</code-btn>

			<code-btn v-if="!state.isPrinting && processAnotherCode" color="success" block :code="processAnotherCode">
				<v-icon class="mr-1">refresh</v-icon> {{ processAnotherText }}
			</code-btn>

			<v-switch :label="$t('panel.jobControl.autoSleep')" v-model="autoSleepActive" :disabled="uiFrozen" hide-details></v-switch>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine', ['autoSleep']),
		...mapState('machine/model', ['job', 'state']),
		...mapGetters('machine/model', ['isPaused']),
		autoSleepActive: {
			get() { return this.autoSleep; },
			set(value) { this.setAutoSleep(value) }
		},
		pauseResumeText() {
			if (this.state.isSimulating) {
				return this.$t(this.isPaused ? 'panel.jobControl.resumeSimulation' : 'panel.jobControl.pauseSimulation');
			}
			if (this.state.mode === 'FFF') {
				return this.$t(this.isPaused ? 'panel.jobControl.resumePrint' : 'panel.jobControl.pausePrint');
			}
			return this.$t(this.isPaused ? 'panel.jobControl.resumeJob' : 'panel.jobControl.pauseJob');
		},
		cancelText() {
			if (this.state.isSimulating) {
				return this.$t('panel.jobControl.cancelSimulation');
			}
			if (this.state.mode === 'FFF') {
				return this.$t('panel.jobControl.cancelPrint');
			}
			return this.$t('panel.jobControl.cancelJob');
		},
		processAnotherCode() {
			if (this.job.lastFileName) {
				if (this.job.lastFileSimulated) {
					return `M37 P"${this.job.lastFileName}"`;
				}
				return `M32 "${this.job.lastFileName}"`;
			}
			return undefined;
		},
		processAnotherText() {
			if (this.job.lastFileSimulated) {
				return this.$t('panel.jobControl.repeatSimulation');
			}
			if (this.state.mode === 'FFF') {
				return this.$t('panel.jobControl.repeatPrint');
			}
			return this.$t('panel.jobControl.repeatJob');
		}
	},
	methods: mapMutations('machine', ['setAutoSleep'])
}
</script>
