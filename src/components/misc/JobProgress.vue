<template>
	<div class="component mb-0">
		<v-layout column>
			<v-flex>
				<v-layout row wrap>
					{{ printStatus }}
					<v-spacer></v-spacer>
					<span>{{ printDetails }}</span>
				</v-layout>
			</v-flex>

			<v-flex>
				<v-progress-linear :value="jobProgress * 100" class="my-1"></v-progress-linear>
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
		...mapState('machine/model', ['job', 'state']),
		...mapGetters('machine/model', ['jobProgress']),
		printStatus() {
			if (this.state.isPrinting) {
				const progress = this.$display(this.jobProgress * 100, 1, '%');
				if (this.state.isSimulating) {
					return `Simulating ${this.printFile}, ${progress} complete`;
				}
				if (this.state.mode === 'CNC') {
					return `Processing ${this.printFile}, ${progress} complete`;
				}
				return `Printing ${this.printFile}, ${progress} complete`;
			} else if (this.job.lastFileName) {
				if (this.job.lastFileSimulated) {
					return `Simulated ${this.job.lastFileName}, 100% complete`;
				}
				if (this.state.mode === 'CNC') {
					return `Processed ${this.job.lastFileName}, 100% complete`;
				}
				return `Printed ${this.job.lastFileName}, 100% complete`;
			}
			return 'No Job running.';
		},
		printDetails() {
			if (!this.state.isPrinting) {
				return '';
			}

			let details = '';
			if (this.job.layer !== undefined && this.job.file.numLayers) {
				details = `Layer ${this.job.layer} of ${this.job.file.numLayers}`;
			}
			if (this.job.extrudedRaw.length) {
				if (details !== '') { details += ', '; }
				details += `Filament Usage: ${this.$display(this.job.extrudedRaw.reduce((a, b) => a + b), 1, 'mm')}`;
				if (this.job.file.filamentNeeded.length) {
					const used = this.job.extrudedRaw.reduce((a, b) => a + b);
					const needed = this.job.file.filamentNeeded.reduce((a, b) => a + b);
					details += ` (${this.$display(Math.max(0, needed - used), 1, 'mm')} remaining)`;
				}
			}
			return details;
		},
		printFile() {
			return this.job.file.name ? extractFileName(this.job.file.name) : undefined;
		}
	}
}
</script>
