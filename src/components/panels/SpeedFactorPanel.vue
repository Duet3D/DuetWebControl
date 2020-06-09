<template>
	<v-card>
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">mdi-timer</v-icon> {{ $t('panel.speedFactor.caption') }}
			<v-spacer></v-spacer>
			<a v-show="speedFactor !== 100" href="javascript:void(0)" :disabled="uiFrozen" @click.prevent="sendCode('M220 S100')" class="subtitle-2">
				<v-icon small class="mr-1">mdi-backup-restore</v-icon> {{ $t('generic.reset') }}
			</a>
		</v-card-title>

		<v-card-text class="py-0">
			<slider v-model="speedFactor" :min="speedFactorMin" :max="speedFactorMax" :disabled="uiFrozen"></slider>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', {
			machineSpeedFactor: state => state.move.speedFactor
		}),
		speedFactor: {
			get() { return (this.machineSpeedFactor !== null) ? (this.machineSpeedFactor * 100): 100; },
			set(value) { this.sendCode(`M220 S${value}`); }
		},
		speedFactorMin() { return Math.max(1, Math.min(100, this.speedFactor - 50)); },
		speedFactorMax() { return Math.max(150, this.speedFactor + 50); }
	},
	methods: mapActions('machine', ['sendCode'])
}
</script>
