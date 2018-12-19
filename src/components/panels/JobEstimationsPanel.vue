<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">watch_later</v-icon> Estimations
		</v-card-title>

		<v-card-text class="pt-0 text-xs-center">
			<v-layout row wrap>
				<v-flex>
					<v-layout column>
						<v-flex tag="strong">
							Based on Filament Usage
						</v-flex>
						<v-flex>
							{{ $displayTime(job.timesLeft.filament) }}
						</v-flex>
					</v-layout>
				</v-flex>
				<v-flex>
					<v-layout column>
						<v-flex tag="strong">
							Based on File Progress
						</v-flex>
						<v-flex>
							{{ $displayTime(job.timesLeft.file) }}
						</v-flex>
					</v-layout>
				</v-flex>
				<v-flex>
					<v-layout column>
						<v-flex tag="strong">
							Based on Layer Time
						</v-flex>
						<v-flex>
							{{ $displayTime(job.timesLeft.layer) }}
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
	computed: mapState('machine/model', ['job'])
}
</script>
