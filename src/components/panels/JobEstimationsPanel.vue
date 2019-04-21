<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">watch_later</v-icon> {{ $t('panel.jobEstimations.caption') }}
		</v-card-title>

		<v-card-text class="pt-0 text-xs-center">
			<v-layout row wrap>
				<v-flex>
					<v-layout column>
						<v-flex tag="strong" class="px-1">
							{{ $t('panel.jobEstimations.filament') }}
						</v-flex>
						<v-flex>
							{{ $displayTime(job.timesLeft.filament) }}
						</v-flex>
					</v-layout>
				</v-flex>
				<v-flex>
					<v-layout column>
						<v-flex tag="strong" class="px-1">
							{{ $t('panel.jobEstimations.file') }}
						</v-flex>
						<v-flex>
							{{ $displayTime(job.timesLeft.file) }}
						</v-flex>
					</v-layout>
				</v-flex>
				<v-flex>
					<v-layout column>
						<v-flex tag="strong" class="px-1">
							{{ $t('panel.jobEstimations.layer') }}
						</v-flex>
						<v-flex>
							{{ $displayTime(job.timesLeft.layer) }}
						</v-flex>
					</v-layout>
				</v-flex>
				<v-flex v-show="job.file.printTime && !state.isSimulating">
					<v-layout column>
						<v-flex tag="strong" class="px-1">
							{{ $t('panel.jobEstimations.slicer') }}
						</v-flex>
						<v-flex>
							{{ $displayTime(state.isPrinting ? Math.max(0, job.file.printTime - job.duration) : job.file.printTime) }}
						</v-flex>
					</v-layout>
				</v-flex>
				<v-flex v-show="job.file.simulatedTime && !state.isSimulating">
					<v-layout column>
						<v-flex tag="strong" class="px-1">
							{{ $t('panel.jobEstimations.simulation') }}
						</v-flex>
						<v-flex>
							{{ $displayTime(state.isPrinting ? Math.max(0, job.file.simulatedTime - job.duration) : job.file.simulatedTime) }}
						</v-flex>
					</v-layout>
				</v-flex>
			</v-layout>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

export default {
	computed: mapState('machine/model', ['job', 'state'])
}
</script>
