<template>
	<v-card outlined>
		<v-card-title>
			{{ $t("panel.settingsHideMenuItems.caption") }}
		</v-card-title>

		<v-card-text class="d-flex flex-column">
			<v-switch :label="$t('panel.settingsHideMenuItems.console')" class="mt-0 mb-3" hide-details
					  v-model="hideConsole" />
			<v-switch :label="$t('panel.settingsHideMenuItems.filamentFiles')" class="mt-0 mb-3" hide-details
					  v-model="hideFilamentFiles" />
			<v-switch :label="$t('panel.settingsHideMenuItems.macroFiles')" class="mt-0 mb-3" hide-details
					  v-model="hideMacroFiles" />
			<v-switch :label="$t('panel.settingsHideMenuItems.systemFiles')" class="mt-0 mb-3" hide-details
					  v-model="hideSystemFiles" />
			<v-switch :label="$t('panel.settingsHideMenuItems.machineSettings')" class="mt-0 mb-3" hide-details
					  v-model="hideMachineSettings" />
			<v-switch :label="$t('panel.settingsHideMenuItems.pluginSettings')" class="mt-0 mb-3" hide-details
					  v-model="hidePluginSettings" />
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";
import { DashboardMode, SettingsState, UnitOfMeasure } from "@/store/settings";

export default Vue.extend({
	computed: {
		hideConsole: {
			get(): boolean { return store.state.settings.hiddenMenuItems.includes("/Console"); },
			set(value: boolean) {
				if (value) {
					this.update({ hiddenMenuItems: [...store.state.settings.hiddenMenuItems, "/Console"] });
				} else {
					this.update({ hiddenMenuItems: store.state.settings.hiddenMenuItems.filter(item => item !== "/Console") });
				}
			}
		},
		hideFilamentFiles: {
			get(): boolean { return store.state.settings.hiddenMenuItems.includes("/Files/Filaments"); },
			set(value: boolean) {
				if (value) {
					this.update({ hiddenMenuItems: [...store.state.settings.hiddenMenuItems, "/Files/Filaments"] });
				} else {
					this.update({ hiddenMenuItems: store.state.settings.hiddenMenuItems.filter(item => item !== "/Files/Filaments") });
				}
			}
		},
		hideMacroFiles: {
			get(): boolean { return store.state.settings.hiddenMenuItems.includes("/Files/Macros"); },
			set(value: boolean) {
				if (value) {
					this.update({ hiddenMenuItems: [...store.state.settings.hiddenMenuItems, "/Files/Macros"] });
				} else {
					this.update({ hiddenMenuItems: store.state.settings.hiddenMenuItems.filter(item => item !== "/Files/Macros") });
				}
			}
		},
		hideSystemFiles: {
			get(): boolean { return store.state.settings.hiddenMenuItems.includes("/Files/System"); },
			set(value: boolean) {
				if (value) {
					this.update({ hiddenMenuItems: [...store.state.settings.hiddenMenuItems, "/Files/System"] });
				} else {
					this.update({ hiddenMenuItems: store.state.settings.hiddenMenuItems.filter(item => item !== "/Files/System") });
				}
			}
		},
		hideMachineSettings: {
			get(): boolean { return store.state.settings.hiddenMenuItems.includes("/Settings/Machine"); },
			set(value: boolean) {
				if (value) {
					this.update({ hiddenMenuItems: [...store.state.settings.hiddenMenuItems, "/Settings/Machine"] });
				} else {
					this.update({ hiddenMenuItems: store.state.settings.hiddenMenuItems.filter(item => item !== "/Settings/Machine") });
				}
			}
		},
		hidePluginSettings: {
			get(): boolean { return store.state.settings.hiddenMenuItems.includes("/Settings/Plugins"); },
			set(value: boolean) {
				if (value) {
					this.update({ hiddenMenuItems: [...store.state.settings.hiddenMenuItems, "/Settings/Plugins"] });
				} else {
					this.update({ hiddenMenuItems: store.state.settings.hiddenMenuItems.filter(item => item !== "/Settings/Plugins") });
				}
			}
		}
	},
	methods: {
		update(data: Partial<SettingsState>) {
			store.commit("settings/update", data);
		}
	}
});;
</script>
