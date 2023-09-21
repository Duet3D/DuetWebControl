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
import { mapWritableState } from "pinia";
import Vue from "vue";

import { useMachineStore } from "@/store/machine";
import { useSettingsStore } from "@/store/settings";
import RestConnector from "@/store/connector/RestConnector";
import PollConnector from "@/store/connector/PollConnector";

export default Vue.extend({
	computed: {
		...mapWritableState(useSettingsStore, ["ignoreFileTimestamps", "pingInterval", "updateDelay", "ajaxRetries", "updateInterval", "fileTransferRetryThreshold", "crcUploads"]),
		isRestConnector(): boolean { return useMachineStore().connector instanceof RestConnector; },
		isPollConnector(): boolean { return useMachineStore().connector instanceof PollConnector; }
	}
});
</script>
