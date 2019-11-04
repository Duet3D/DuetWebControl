<template>
	<v-row dense>
		<v-col cols="12" class="d-flex">
			<span>{{ printStatus }}</span>
			<v-spacer></v-spacer>
			<span>{{ printDetails }}</span>
		</v-col>

		<v-col cols="12">
			<v-progress-linear :value="jobProgress * 100" class="my-1"></v-progress-linear>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

import { extractFileName } from '../../utils/path.js'

export default {
	computed: {
		...mapState('machine/model', ['job', 'state']),
		...mapGetters('machine/model', ['isPrinting', 'isSimulating', 'jobProgress']),
		printStatus() {
			if (this.isPrinting) {
				const progress = this.$display(this.jobProgress * 100, 1, '%');
				if (this.isSimulating) {
					return this.$t('jobProgress.simulating', [this.printFile, progress]);
				}
				if (this.state.mode === 'FFF') {
					return this.$t('jobProgress.printing', [this.printFile, progress]);
				}
				return this.$t('jobProgress.processing', [this.printFile, progress]);
			} else if (this.job.lastFileName) {
				if (this.job.lastFileSimulated) {
					return this.$t('jobProgress.simulated', [this.job.lastFileName]);
				}
				if (this.state.mode === 'FFF') {
					return this.$t('jobProgress.printed', [this.job.lastFileName]);
				}
				return this.$t('jobProgress.processed', [this.job.lastFileName]);
			}
			return this.$t('jobProgress.noJob');
		},
		printDetails() {
			if (!this.isPrinting) {
				return '';
			}

			let details = '';
			if (this.job.layer !== null && this.job.file.numLayers) {
				details = this.$t('jobProgress.layer', [this.job.layer, this.job.file.numLayers]);
			}
			if (this.job.extrudedRaw.length) {
				if (details !== '') { details += ', '; }
				details += this.$t('jobProgress.filament', [this.$display(this.job.extrudedRaw.reduce((a, b) => a + b), 1, 'mm')]);
				if (this.job.file.filament.length) {
					const used = this.job.extrudedRaw.reduce((a, b) => a + b);
					const needed = this.job.file.filament.reduce((a, b) => a + b);
					details += ' (' + this.$t('jobProgress.filamentRemaining', [this.$display(Math.max(needed - used, 0), 1, 'mm')]) + ')';
				}
			}
			return details;
		},
		printFile() {
			return this.job.file.fileName ? extractFileName(this.job.file.fileName) : undefined;
		}
	}
}
</script>
