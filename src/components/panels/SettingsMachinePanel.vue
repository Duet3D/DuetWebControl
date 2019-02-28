<template>
	<v-card>
		<v-card-title>
			<span>{{ $t('panel.settingsMachine.caption') }}</span>
			<v-spacer></v-spacer>
			<a v-if="!isLocal" href="/reprap.htm">
				<v-icon small class="mr-1">fast_rewind</v-icon> {{ $t('panel.settingsMachine.revertDWC') }}
			</a>
		</v-card-title>

		<v-container fluid grid-list-lg class="px-3">
			<v-layout column>
				<v-flex>
					<v-text-field v-model.number="babystepAmount" type="number" step="any" min="0.001" :label="$t('panel.settingsMachine.babystepAmount', ['mm'])"></v-text-field>
				</v-flex>
				<v-flex>
					<v-text-field v-model.number="moveFeedrate" type="number" step="any" min="0.001" :label="$t('panel.settingsMachine.moveFeedrate', ['mm/min'])"></v-text-field>
				</v-flex>
			</v-layout>
		</v-container>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState('machine', ['settings']),
		...mapState(['isLocal']),
		babystepAmount: {
			get() { return this.settings.babystepAmount; },
			set(value) { if (this.isNumber(value) && value > 0) { this.update({ babystepAmount: value }); } }
		},
		moveFeedrate: {
			get() { return this.settings.moveFeedrate; },
			set(value) { if (this.isNumber(value) && value > 0) { this.update({ moveFeedrate: value }); } }
		}
	},
	methods: mapMutations('machine/settings', ['update'])
}
</script>
