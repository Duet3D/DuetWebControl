<template>
	<v-card>
		<v-card-title>
			{{ $t('panel.settingsNotifications.caption') }}
		</v-card-title>

		<v-container fluid grid-list-lg class="px-3">
			<v-layout column>
				<v-flex>
					<v-switch class="mt-0" v-model="notificationErrorsPersistent" :label="$t('panel.settingsNotifications.notificationErrorsPersistent')" hide-details></v-switch>
				</v-flex>
				<v-flex>
					<v-text-field v-model.number="notificationTimeout" type="number" step="any" min="0" :label="$t('panel.settingsNotifications.notificationTimeout', ['ms'])"></v-text-field>
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
