<template>
	<v-card outlined>
		<v-card-title class="pb-0">
			{{ $t("panel.settingsGeneral.caption") }}

			<v-spacer />

			<a v-show="!uiFrozen" href="javascript:void(0)" @click="showResetConfirmation = true">
				<v-icon small class="mr-1">mdi-restore</v-icon>
				{{ $t("panel.settingsGeneral.factoryReset") }}
			</a>
		</v-card-title>

		<v-card-text>
			<v-row :dense="$vuetify.breakpoint.mobile">
				<v-col cols="12" sm="6">
					<v-switch v-model="settingsStorageLocal" :label="$t('panel.settingsGeneral.settingsStorageLocal')"
							  :disabled="!supportsLocalStorage" hide-details />
				</v-col>
				<v-col cols="12" sm="6">
					<v-text-field v-model.number="settingsSaveDelay" type="number" step="any" min="0"
								  :label="$t('panel.settingsGeneral.settingsSaveDelay', ['ms'])" hide-details />
				</v-col>
				<v-col cols="12" sm="6">
					<v-switch v-model="cacheStorageLocal" :label="$t('panel.settingsGeneral.cacheStorageLocal')"
							  :disabled="!supportsLocalStorage" hide-details />
				</v-col>
				<v-col cols="12" sm="6">
					<v-text-field v-model.number="cacheSaveDelay" type="number" step="any" min="0"
								  :label="$t('panel.settingsGeneral.cacheSaveDelay', ['ms'])" hide-details />
				</v-col>
			</v-row>
		</v-card-text>

		<confirm-dialog :shown.sync="showResetConfirmation" :title="$t('dialog.factoryReset.title')"
						:prompt="$t('dialog.factoryReset.prompt')" @confirmed="reset" />
	</v-card>
</template>

<script lang="ts">
import { mapState, mapWritableState } from "pinia";
import { defineComponent } from "vue";

import { useSettingsStore } from "@/store/settings";
import { useUiStore } from "@/store/ui";
import { localStorageSupported } from "@/utils/localStorage";

export default defineComponent({
	computed: {
		...mapState(useUiStore, ["uiFrozen"]),
		...mapWritableState(useSettingsStore, ["darkTheme", "settingsStorageLocal", "settingsSaveDelay", "cacheStorageLocal", "cacheSaveDelay"]),
		supportsLocalStorage() { return localStorageSupported; }
	},
	data() {
		return {
			showResetConfirmation: false
		};
	},
	methods: {
		async reset() {
			await useSettingsStore().reset();
		}
	}
});
</script>
