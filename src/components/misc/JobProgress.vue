<template>
	<div>
		<v-layout column>
			<v-flex>
				<v-layout row wrap>
					{{ printFile ? `Printing ${printFile}, ${$display(progress * 100, 1, '%')} complete` : 'No Job running.' }}
					<v-spacer></v-spacer>
					<span v-if="job.extrudedRaw.length">
						Filament Usage: {{ $display(job.extrudedRaw.reduce((a, b) => a + b), 1, 'mm') }}
						<template v-if="job.filamentNeeded.length">
							of {{ $display(job.filamentNeeded.reduce((a, b) => a + b), 1, 'mm') }} ({{ $display(filamentLeft, 1, 'mm') }} remaining)
						</template>
					</span>
				</v-layout>
			</v-flex>

			<v-flex>
				<v-progress-linear :value="jobProgress" class="my-1"></v-progress-linear>
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
		...mapState('machine', ['job', 'state']),
		...mapGetters('machine', ['jobProgress']),
		filamentLeft() {
			return Math.max(0, this.job.filamentNeeded.reduce((a, b) => a + b) - this.job.extrudedRaw.reduce((a, b) => a + b));
		},
		printFile() {
			return this.job.fileName ? extractFileName(this.job.fileName) : undefined;
		}
	}
}
</script>
