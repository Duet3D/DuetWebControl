<template>
	<v-card outlined>
		<v-card-title>
			{{ $t("panel.settingsNotifications.caption") }}
		</v-card-title>

		<v-card-text>
			<v-row>
				<v-col cols="6" xs="12">
					<v-switch class="mt-0 mb-3" v-model="notificationErrorsPersistent"
							  :label="$t('panel.settingsNotifications.notificationErrorsPersistent')" hide-details />
				</v-col>
				<v-col cols="6" xs="12">
					<v-text-field v-model.number="notificationTimeout" type="number" step="any" min="0"
								  :label="$t('panel.settingsNotifications.notificationTimeout', ['ms'])" hide-details />
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import Vue from "vue";

import { useSettingsStore } from "@/store/settings";

export default Vue.extend({
	computed: {
		notificationErrorsPersistent: {
			get(): boolean { return useSettingsStore().notifications.errorsPersistent; },
			set(value: boolean) { useSettingsStore().notifications.errorsPersistent = value; }
		},
		notificationTimeout: {
			get(): number { return useSettingsStore().notifications.timeout; },
			set(value: number) { if (isFinite(value) && value >= 0) { useSettingsStore().notifications.timeout = value; } }
		}
	}
});
</script>
