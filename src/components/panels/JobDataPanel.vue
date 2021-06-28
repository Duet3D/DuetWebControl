<template>
	<v-card>
		<v-card-title class="pb-1">
			<v-icon small class="mr-1">mdi-dots-horizontal</v-icon> {{ $t('panel.jobData.caption') }}
		</v-card-title>

		<v-card-text class="text-center pb-2">
			<v-row dense>
				<v-col class="d-flex flex-column">
					<strong>
						{{ $t('panel.jobData.warmUpDuration') }}
					</strong>
					<span>
						{{ $displayTime(job.warmUpDuration) }}
					</span>
				</v-col>

				<v-col class="d-flex flex-column">
					<strong>
						{{ $t('panel.jobData.currentLayerTime') }}
					</strong>
					<span>
						{{ $displayTime(job.layerTime) }}
					</span>
				</v-col>

				<v-col class="d-flex flex-column">
					<strong>
						{{ $t('panel.jobData.lastLayerTime') }}
					</strong>
					<span>
						{{ $displayTime(job.layers.length ? job.layers[job.layers.length - 1].duration : null) }}
					</span>
				</v-col>

				<v-col class="d-flex flex-column">
					<strong>
						{{ $t('panel.jobData.jobDuration') }}
					</strong>
					<span>
						{{ $displayTime(jobDuration) }}
					</span>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

import { isPrinting } from '../../store/machine/modelEnums.js'

export default {
	computed: {
		...mapState('machine/model', ['job', 'state']),
		lastLayerTime() {
			if (!this.job.layers.length) {
				return undefined;
			}
			return this.job.layers[this.job.layers.length - 1].time;
		},
		jobDuration() {
			return isPrinting(this.state.status) ? this.job.duration : this.job.lastDuration;
		}
	}
}
</script>
