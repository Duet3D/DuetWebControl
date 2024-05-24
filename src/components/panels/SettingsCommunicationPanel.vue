<template>
	<v-card outlined>
		<v-card-title class="pb-0">
			{{ $t("panel.settingsCommunication.caption") }}
		</v-card-title>

		<v-card-text>
			<v-row :dense="$vuetify.breakpoint.mobile">
				<template v-if="isRestConnector">
					<v-col cols="6">
						<v-text-field v-model.number="pingInterval" type="number" step="1" min="0"
									  :label="$t('panel.settingsCommunication.pingInterval', ['ms'])" hide-details />
					</v-col>
					<v-col cols="6">
						<v-text-field v-model.number="updateDelay" type="number" step="1" min="0"
									  :label="$t('panel.settingsCommunication.updateDelay', ['ms'])" hide-details />
					</v-col>
				</template>
				<template v-else-if="isPollConnector">
					<v-col cols="6">
						<v-text-field v-model.number="ajaxRetries" type="number" step="1" min="0"
									  :label="$t('panel.settingsCommunication.ajaxRetries')" hide-details />
					</v-col>
					<v-col cols="6">
						<v-text-field v-model.number="retryDelay" type="number" step="1" min="0"
									  :label="$t('panel.settingsCommunication.retryDelay')" hide-details />
					</v-col>
					<v-col cols="6">
						<v-text-field v-model.number="updateInterval" type="number" step="1" min="0"
									  :label="$t('panel.settingsCommunication.updateInterval', ['ms'])" hide-details />
					</v-col>
					<v-col cols="6">
						<v-text-field v-model.number="fileTransferRetryThreshold" type="number" step="1" min="1"
									  :label="$t('panel.settingsCommunication.fileTransferRetryThreshold', ['KiB'])"
									  hide-details />
					</v-col>
					<v-col cols="12">
						<v-switch v-model="crcUploads" :label="$t('panel.settingsCommunication.crcUploads')"
								  hide-details class="mt-0" />
					</v-col>
					<v-col cols="12">
						<v-switch v-model="ignoreFileTimestamps"
								  :label="$t('panel.settingsGeneral.ignoreFileTimestamps')" class="mt-0" hide-details />
					</v-col>
				</template>
				<v-col v-else>
					{{ $t("panel.settingsCommunication.unavailable") }}
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";
import { MachineSettingsState } from "@/store/machine/settings";
import RestConnector from "@/store/machine/connector/RestConnector";
import PollConnector from "@/store/machine/connector/PollConnector";

export default Vue.extend({
	computed: {
		isRestConnector(): boolean { return store.getters["machine/connector"] instanceof RestConnector; },
		isPollConnector(): boolean { return store.getters["machine/connector"] instanceof PollConnector; },
		ignoreFileTimestamps: {
			get(): boolean { return store.state.machine.settings.ignoreFileTimestamps; },
			set(value: boolean) { this.update({ ignoreFileTimestamps: value }); }
		},
		pingInterval: {
			get(): number { return store.state.machine.settings.pingInterval; },
			set(value: number) { if (isFinite(value) && value >= 0) { this.update({ pingInterval: value }); } }
		},
		updateDelay: {
			get(): number { return store.state.machine.settings.updateDelay; },
			set(value: number) { if (isFinite(value) && value >= 0) { this.update({ updateDelay: value }); } }
		},
		ajaxRetries: {
			get(): number { return store.state.machine.settings.ajaxRetries; },
			set(value: number) { if (isFinite(value) && value >= 0) { this.update({ ajaxRetries: value }); } }
		},
		retryDelay: {
			get(): number { return store.state.machine.settings.retryDelay; },
			set(value: number) { if (isFinite(value) && value >= 0) { this.update({ retryDelay: value }); } }
		},
		updateInterval: {
			get(): number { return store.state.machine.settings.updateInterval; },
			set(value: number) { if (isFinite(value) && value >= 0) { this.update({ updateInterval: value }); } }
		},
		fileTransferRetryThreshold: {
			get(): number { return Math.round(store.state.machine.settings.fileTransferRetryThreshold / 1024); },
			set(value: number) { if (isFinite(value) && value > 0) { this.update({ fileTransferRetryThreshold: Math.round(value * 1024) }); } }
		},
		crcUploads: {
			get(): boolean { return store.state.machine.settings.crcUploads; },
			set(value: boolean) { this.update({ crcUploads: value }); }
		}
	},
	methods: {
		update(data: Partial<MachineSettingsState>) {
			store.commit("machine/settings/update", data);
		}
	}
});
</script>
