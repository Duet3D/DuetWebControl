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
			<v-icon small class="mr-1">mdi-information</v-icon> {{ $t('panel.jobInfo.caption') }}
		</v-card-title>

		<v-card-text class="d-flex flex-column pt-0">
			<p>
				<strong>{{ $t('panel.jobInfo.height') }}</strong> {{ (jobFile.height > 0) ? $displayZ(jobFile.height) : $t('generic.noValue') }}
			</p>
			<p v-if="isFFF">
				<strong>{{ $t('panel.jobInfo.layerHeight') }}</strong> {{ $displayZ(jobFile.layerHeight) }}
			</p>
			<p v-if="isFFF">
				<strong>{{ $t('panel.jobInfo.filament') }}</strong> {{ $displayZ(jobFile.filament, 'mm') }}
			</p>
			<p>
				<strong>{{ $t('panel.jobInfo.generatedBy') }}</strong> {{ $display(jobFile.generatedBy) }}
			</p>
		</v-card-text>
	</v-card>

</template>

<script>
'use strict'

import { mapState } from 'vuex'

import { MachineMode } from '../../store/machine/modelEnums.js'

export default {
	computed: {
		...mapState('machine/model', {
			machineMode: state => state.state.machineMode,
			jobFile: state => state.job.file
		}),
		isFFF() { return this.machineMode === MachineMode.fff; }
	}
}
</script>
