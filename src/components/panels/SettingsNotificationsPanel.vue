<template>
	<v-card outlined>
		<v-card-title>
			{{ $t('panel.settingsNotifications.caption') }}
		</v-card-title>

		<v-card-text>
			<v-row>
				<v-col cols="6" xs="12">
					<v-switch class="mt-0 mb-3" v-model="notificationErrorsPersistent" :label="$t('panel.settingsNotifications.notificationErrorsPersistent')" hide-details></v-switch>
				</v-col>
				<v-col cols="6" xs="12">
					<v-text-field v-model.number="notificationTimeout" type="number" step="any" min="0" :label="$t('panel.settingsNotifications.notificationTimeout', ['ms'])" hide-details></v-text-field>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState(['settings']),
		notificationErrorsPersistent: {
			get() { return this.settings.notifications.errorsPersistent; },
			set(value) { this.update({ notifications: { errorsPersistent: value } }); }
		},
		notificationTimeout: {
			get() { return this.settings.notifications.timeout; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ notifications: { timeout: value } }); } }
		}
	},
	methods: mapMutations('settings', ['update'])
}
</script>
