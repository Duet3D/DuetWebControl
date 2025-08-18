<template>
	<v-card outlined>
		<v-card-title>
			{{ $t("panel.settingsAppearance.caption") }}
		</v-card-title>

		<v-card-text class="d-flex flex-column">
			<v-switch :label="$t('panel.settingsAppearance.darkTheme')" class="mt-0 mb-3" hide-details
					  v-model="darkTheme" />
			<v-select :items="languages" :label="$t('panel.settingsAppearance.language')" :return-object="false"
					  hide-details item-text="language" item-value="code" v-model="language" />
			<v-tooltip bottom>
				<template #activator="{ on }">
					<v-switch :label="$t('panel.settingsAppearance.binaryFileSizes')" hide-details
							  v-model="useBinaryPrefix" v-on="on" />
				</template>
				{{ $t("panel.settingsAppearance.binaryFileSizesTitle") }}
			</v-tooltip>
			<v-tooltip bottom>
				<template #activator="{ on }">
					<v-switch :label="$t('panel.settingsAppearance.disableAutoComplete')" hide-details
							  v-model="disableAutoComplete" v-on="on" />
				</template>
				{{ $t("panel.settingsAppearance.disableAutoCompleteTitle") }}
			</v-tooltip>
			<v-select :items="dashboardModes" :label="$t('panel.settingsAppearance.dashboardModeTitle')" class="mt-3"
					  hide-details item-text="value" item-value="value" v-model="dashboardMode" />
			<v-switch :label="$t('panel.settingsAppearance.bottomNavigation')" hide-details
					  v-model="bottomNavigation" />
			<v-switch :label="$t('panel.settingsAppearance.numericInputs')" hide-details v-model="numericInputs" />
			<v-switch :label="$t('panel.settingsAppearance.iconMenu')" hide-details v-model="iconMenu" />
			<v-select :items="[0, 1, 2, 3]" v-model.number="decimalPlaces"
					  :label="$t('panel.settingsAppearance.decimalPlaces')" hide-details class="mt-3" />
			<v-select :items="unitsOfMeasure" v-model="displayUnits"
					  :label="$t('panel.settingsAppearance.displayUnitsTitle')" class="mt-3" hide-details
					  item-text="value" item-value="value" />
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";
import { DashboardMode, SettingsState, UnitOfMeasure } from "@/store/settings";

export default Vue.extend({
	computed: {
		darkTheme: {
			get(): boolean { return store.state.settings.darkTheme; },
			set(value: boolean) { this.update({ darkTheme: value }); }
		},
		decimalPlaces: {
			get(): number { return store.state.settings.decimalPlaces; },
			set(value: number) { this.update({ decimalPlaces: value }); }
		},
		displayUnits: {
			get(): UnitOfMeasure { return store.state.settings.displayUnits; },
			set(value: UnitOfMeasure) { this.update({ displayUnits: value }); }
		},
		language: {
			get(): string { return store.state.settings.language; },
			set(value: string) { this.update({ language: value }); }
		},
		languages() {
			const result: Array<{ code: string, language: string }> = [];
			for (let key in this.$i18n.messages) {
				result.push({
					code: key,
					language: this.$i18n.messages[key].language as string
				});
			}
			return result;
		},
		useBinaryPrefix: {
			get(): boolean { return store.state.settings.useBinaryPrefix; },
			set(value: boolean) { this.update({ useBinaryPrefix: value }); }
		},
		disableAutoComplete: {
			get(): boolean { return store.state.settings.disableAutoComplete; },
			set(value: boolean) { this.update({ disableAutoComplete: value }); }
		},
		dashboardMode: {
			get(): DashboardMode {
				if (!store.state.settings.dashboardMode) {
					return DashboardMode.default;
				}
				return store.state.settings.dashboardMode;
			},
			set(value: DashboardMode) {
				this.update({ dashboardMode: value });
			},
		},
		dashboardModes() {
			return Object.entries(DashboardMode).map(([key, value]) => {
				return {
					key,
					value
				};
			});
		},
		unitsOfMeasure() {
			return Object.entries(UnitOfMeasure).map(([key, value]) => {
				return {
					key,
					value
				};
			});
		},
		bottomNavigation: {
			get(): boolean { return store.state.settings.bottomNavigation; },
			set(value: boolean) { this.update({ bottomNavigation: value }); }
		},
		numericInputs: {
			get(): boolean { return store.state.settings.numericInputs; },
			set(value: boolean) { this.update({ numericInputs: value }); }
		},
		iconMenu: {
			get(): boolean { return store.state.settings.iconMenu; },
			set(value: boolean) { this.update({ iconMenu: value }); }
		},
	},
	methods: {
		update(data: Partial<SettingsState>) {
			store.commit("settings/update", data);
		}
	}
});;
</script>
