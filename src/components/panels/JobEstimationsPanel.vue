<template>
	<v-card>
		<v-card-title class="pb-1">
			<v-icon small class="mr-1">mdi-clock</v-icon> {{ $t('panel.jobEstimations.caption') }}
		</v-card-title>

		<v-card-text class="text-center pb-1">
			<v-row dense>
				<v-col class="d-flex flex-column">
					<strong>
						{{ $t('panel.jobEstimations.filament') }}
					</strong>
					<span>
						{{ $displayTime(job.timesLeft.filament) }}
					</span>
				</v-col>

				<v-col class="d-flex flex-column">
					<strong>
						{{ $t('panel.jobEstimations.file') }}
					</strong>
					<span>
						{{ $displayTime(job.timesLeft.file) }}
					</span>
				</v-col>

				<v-col class="d-flex flex-column">
					<strong>
						{{ $t('panel.jobEstimations.layer') }}
					</strong>
					<span>
						{{ $displayTime(job.timesLeft.layer) }}
					</span>
				</v-col>

				<v-col v-if="job.file.printTime && !isSimulating" class="d-flex flex-column">
					<strong>
						{{ $t('panel.jobEstimations.slicer') }}
					</strong>
					<span>
						{{ $displayTime(isPrinting ? Math.max(0, job.file.printTime - job.duration) : job.file.printTime) }}
					</span>
				</v-col>

				<v-col v-if="job.file.simulatedTime && !isSimulating" class="d-flex flex-column">
					<strong>
						{{ $t('panel.jobEstimations.simulation') }}
					</strong>
					<span>
						{{ $displayTime(isPrinting ? Math.max(0, job.file.simulatedTime - job.duration) : job.file.simulatedTime) }}
					</span>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

import { isPrinting, StatusType } from '../../store/machine/modelEnums.js'

export default {
	computed: {
		...mapState('machine/model', {
			job: state => state.job,
			status: state => state.state.status
		}),
		isPrinting() {
			return isPrinting(this.status);
		},
		isSimulating() {
			return this.status === StatusType.simulating;
		}
	}
}
</script>
