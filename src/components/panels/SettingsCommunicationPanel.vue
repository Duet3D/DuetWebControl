<template>
	<v-card outlined>
		<v-card-title class="pb-0">
			{{ $t('panel.settingsCommunication.caption') }}
		</v-card-title>

		<v-card-text>
			<v-row :dense="$vuetify.breakpoint.mobile">
				<template v-if="connectorType === 'rest'">
					<v-col cols="6">
						<v-text-field v-model.number="pingInterval" type="number" step="1" min="0" :label="$t('panel.settingsCommunication.pingInterval', ['ms'])" hide-details></v-text-field>
					</v-col>
					<v-col cols="6">
						<v-text-field v-model.number="updateDelay" type="number" step="1" min="0" :label="$t('panel.settingsCommunication.updateDelay', ['ms'])" hide-details></v-text-field>
					</v-col>
				</template>
				<template v-else-if="connectorType === 'poll'">
					<v-col cols="6">
						<v-text-field v-model.number="ajaxRetries" type="number" step="1" min="0" :label="$t('panel.settingsCommunication.ajaxRetries')" hide-details></v-text-field>
					</v-col>
					<v-col cols="6">
						<v-text-field v-model.number="updateInterval" type="number" step="1" min="0" :label="$t('panel.settingsCommunication.updateInterval', ['ms'])" hide-details></v-text-field>
					</v-col>
					<v-col cols="6">
						<v-text-field v-model.number="extendedUpdateEvery" type="number" step="1" min="1" :label="$t('panel.settingsCommunication.extendedUpdateEvery')" hide-details></v-text-field>
					</v-col>
					<v-col cols="6">
						<v-text-field v-model.number="fileTransferRetryThreshold" type="number" step="1" min="1" :label="$t('panel.settingsCommunication.fileTransferRetryThreshold', ['KiB'])" hide-details></v-text-field>
					</v-col>
					<v-col cols="12">
						<v-switch v-model="crcUploads" :label="$t('panel.settingsCommunication.crcUploads')" hide-details class="mt-0"></v-switch>
					</v-col>
					<v-col cols="12">
						<v-switch v-model="ignoreFileTimestamps" :label="$t('panel.settingsGeneral.ignoreFileTimestamps')" class="mt-0" hide-details></v-switch>
					</v-col>
				</template>
				<v-col v-else>
					{{ $t('panel.settingsCommunication.unavailable') }}
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState('machine', ['settings']),
		...mapGetters('machine', ['connector']),
		connectorType() {
			return this.connector ? this.connector.type : null;
		},
		ignoreFileTimestamps: {
			get() { return this.settings.ignoreFileTimestamps; },
			set(value) { this.update({ ignoreFileTimestamps: value }); }
		},
		pingInterval: {
			get() { return this.settings.pingInterval; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ pingInterval: value }); } }
		},
		updateDelay: {
			get() { return this.settings.updateDelay; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ updateDelay: value }); } }
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
		},
		crcUploads: {
			get() { return this.settings.crcUploads; },
			set(value) { this.update({ crcUploads: value }); }
		}
	},
	methods: mapMutations('machine/settings', ['update'])
}
</script>
