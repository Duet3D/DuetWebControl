<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">linear_scale</v-icon> Collected Data
		</v-card-title>

		<v-card-text class="pt-0 text-xs-center">
			<v-layout row wrap>
				<v-flex>
					<v-layout column>
						<v-flex tag="strong">
							Warm-Up Time
						</v-flex>
						<v-flex tag="span">
							{{ $displayTime(job.warmUpTime) }}
						</v-flex>
					</v-layout>
				</v-flex>
				<v-flex>
					<v-layout column>
						<v-flex tag="strong">
							Current Layer Time
						</v-flex>
						<v-flex tag="span">
							{{ $displayTime(job.layerTime) }}
						</v-flex>
					</v-layout>
				</v-flex>
				<v-flex>
					<v-layout column>
						<v-flex tag="strong">
							Last Layer Time
						</v-flex>
						<v-flex tag="span">
							{{ $displayTime(job.layers.length ? job.layers[job.layers.length - 1].duration : undefined) }}
						</v-flex>
					</v-layout>
				</v-flex>
				<v-flex>
					<v-layout column>
						<v-flex tag="strong">
							Job Duration
						</v-flex>
						<v-flex tag="span">
							{{ $displayTime(job.duration) }}
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
	computed: {
		...mapState('machine/model', ['job']),
		lastLayerTime() {
			if (!this.job.layers.length) {
				return undefined;
			}
			return this.job.layers[this.job.layers.length - 1].time;
		}
	}
}
</script>
