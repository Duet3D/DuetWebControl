<template>
	<v-card outlined>
		<v-card-title>
			{{ $t("panel.settingsAppearance.caption") }}
		</v-card-title>

		<v-card-text class="d-flex flex-column">
			<v-switch :label="$t('panel.settingsAppearance.darkTheme')" class="mt-0 mb-3" hide-details
					  v-model="darkTheme" />
			<v-select :items="languages" :label="$t('panel.settingsAppearance.language')" :return-object="false"
					  hide-details item-text="language" item-value="code" v-model="locale" />
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
			<v-select :items="[0, 1, 2, 3, 4]" v-model.number="decimalPlaces"
					  :label="$t('panel.settingsAppearance.decimalPlaces')" hide-details class="mt-3" />
			<v-select :items="unitsOfMeasure" v-model="displayUnits"
					  :label="$t('panel.settingsAppearance.displayUnitsTitle')" class="mt-3" hide-details
					  item-text="value" item-value="value" />
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { mapWritableState } from "pinia";
import { defineComponent } from "vue";

import { DashboardMode, UnitOfMeasure, useSettingsStore } from "@/store/settings";
import { messages } from "@/i18n";

export default defineComponent({
	computed: {
		...mapWritableState(useSettingsStore, ["darkTheme", "decimalPlaces", "displayUnits", "locale", "useBinaryPrefix", "disableAutoComplete", "bottomNavigation", "iconMenu", "numericInputs"]),
		languages() {
			const result: Array<{ code: string, language: string }> = [];
			for (let key in messages) {
				result.push({
					code: key,
					language: (messages[key] as any).language
				});
			}
			return result;
		},
		dashboardMode: {
			get(): DashboardMode {
				const settingsStore = useSettingsStore();
				return settingsStore.dashboardMode ?? DashboardMode.default;
			},
			set(value: DashboardMode) { useSettingsStore().dashboardMode = value; }
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
		}
	}
});
</script>
