<template>
	<div class="component">
		<v-layout column>
			<v-flex>
				<v-layout row wrap>
					{{ printFile ? `Printing ${printFile}, ${$display(jobProgress * 100, 1, '%')} complete` : (job.lastFileName ? `Printed ${job.lastFileName}, 100% complete` : 'No Job running.') }}
					<v-spacer></v-spacer>
					<span>{{ printDetails }}</span>
				</v-layout>
			</v-flex>

			<v-flex>
				<v-progress-linear :value="job.lastFileName ? 100 : (jobProgress * 100)" class="my-1"></v-progress-linear>
			</v-flex>
		</v-layout>
	</div>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

import { extractFileName } from '../../utils/path.js'

export default {
	computed: {
		...mapState('machine', ['lastPrintedFile']),
		...mapState('machine/model', ['job', 'state']),
		...mapGetters('machine/model', ['isPrinting', 'jobProgress']),
		printDetails() {
			if (!this.isPrinting) {
				return '';
			}

			let details = '';
			if (this.job.layer !== undefined && this.job.numLayers) {
				details = `Layer ${this.job.layer} of ${this.job.numLayers}`;
			}
			if (this.job.extrudedRaw.length) {
				if (details !== '') { details += ', '; }
				details += `Filament Usage: ${this.$display(this.job.extrudedRaw.reduce((a, b) => a + b), 1, 'mm')}`;
				if (this.job.filamentNeeded.length) {
					const used = this.job.extrudedRaw.reduce((a, b) => a + b);
					const needed = this.job.filamentNeeded.reduce((a, b) => a + b);
					details += ` (${this.$display(Math.max(0, needed - used), 1, 'mm')} remaining)`;
				}
			}
			return details;
		},
		printFile() {
			return this.job.fileName ? extractFileName(this.job.fileName) : undefined;
		}
	}
}
</script>
