<style scoped>
p {
	margin-bottom: 8px;
}
p:last-child {
	margin-bottom: 0;
}
</style>

<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">info</v-icon> {{ $t('panel.jobInfo.caption') }}
		</v-card-title>

		<v-card-text class="pt-0">
			<v-layout column class="list">
				<v-flex tag="p">
					<strong>{{ $t('panel.jobInfo.height') }}</strong> {{ $displayZ(jobFile.height) }}
				</v-flex>
				<v-flex tag="p" v-if="mode === 'FFF'">
					<strong>{{ $t('panel.jobInfo.layerHeight') }}</strong> {{ $displayZ(jobFile.layerHeight) }}
				</v-flex>
				<v-flex tag="p" v-if="mode === 'FFF'">
					<strong>{{ $t('panel.jobInfo.filament') }}</strong> {{ $displayZ(jobFile.filament, 'mm') }}
				</v-flex>
				<v-flex tag="p">
					<strong>{{ $t('panel.jobInfo.generatedBy') }}</strong> {{ $display(jobFile.generatedBy) }}
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
		...mapState('machine/model', {
			mode: state => state.state.mode,
			jobFile: state => state.job.file
		})
	}
}
</script>
