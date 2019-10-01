<template>
	<v-card>
		<v-card-title>
			{{ $t('panel.settingsCommunication.caption') }}
		</v-card-title>

		<v-container fluid grid-list-lg class="px-3">
			<v-layout row wrap align-center v-if="connector === 'rest'">
				<v-flex>
					<v-text-field v-model.number="pingInterval" type="number" step="1" min="0" :label="$t('panel.settingsCommunication.pingInterval', ['ms'])"></v-text-field>
				</v-flex>
			</v-layout>
			<v-layout row wrap align-center v-else-if="connector === 'poll'">
				<v-flex xs6 sm6 md6>
					<v-text-field v-model.number="ajaxRetries" type="number" step="1" min="0" :label="$t('panel.settingsCommunication.ajaxRetries')"></v-text-field>
				</v-flex>
				<v-flex xs6 sm6 md6>
					<v-text-field v-model.number="updateInterval" type="number" step="1" min="0" :label="$t('panel.settingsCommunication.updateInterval', ['ms'])"></v-text-field>
				</v-flex>
				<v-flex xs6 sm6 md6>
					<v-text-field v-model.number="extendedUpdateEvery" type="number" step="1" min="1" :label="$t('panel.settingsCommunication.extendedUpdateEvery')"></v-text-field>
				</v-flex>
				<v-flex xs6 sm6 md6>
					<v-text-field v-model.number="fileTransferRetryThreshold" type="number" step="1" min="1" :label="$t('panel.settingsCommunication.fileTransferRetryThreshold', ['KiB'])"></v-text-field>
				</v-flex>
			</v-layout>
			<template v-else>
				{{ $t('panel.settingsCommunication.unavailable') }}
			</template>
		</v-container>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState('machine', ['settings']),
		...mapGetters('machine', ['connector']),
		pingInterval: {
			get() { return this.settings.pingInterval; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ pingInterval: value }); } }
		},
		ajaxRetries: {
			get() { return this.settings.ajaxRetries; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ ajaxRetries: value }); } }
		},
		updateInterval: {
			get() { return this.settings.updateInterval; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ updateInterval: value }); } }
		},
		extendedUpdateEvery: {
			get() { return this.settings.extendedUpdateEvery; },
			set(value) { if (this.isNumber(value) && value > 0) { this.update({ extendedUpdateEvery: value }); } }
		},
		fileTransferRetryThreshold: {
			get() { return Math.round(this.settings.fileTransferRetryThreshold / 1024); },
			set(value) { if (this.isNumber(value) && value > 0) { this.update({ fileTransferRetryThreshold: Math.round(value * 1024) }); } }
		}
	},
	methods: mapMutations('machine/settings', ['update'])
}
</script>
