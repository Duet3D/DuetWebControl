<template>
	<v-card outlined>
		<v-card-title>{{ $t('panel.settingsAppearance.caption') }}</v-card-title>

		<v-card-text class="d-flex flex-column">
			<v-switch :label="$t('panel.settingsAppearance.darkTheme')" class="mt-0 mb-3" hide-details v-model="darkTheme"></v-switch>
			<v-select :items="languages" :label="$t('panel.settingsAppearance.language')" :return-object="false" hide-details item-text="language" item-value="code" v-model="language"></v-select>
			<v-tooltip bottom>
				<template #activator="{ on }">
					<v-switch :label="$t('panel.settingsAppearance.binaryFileSizes')" hide-details v-model="useBinaryPrefix" v-on="on"></v-switch>
				</template>
				{{ $t('panel.settingsAppearance.binaryFileSizesTitle') }}
			</v-tooltip>
			<v-tooltip bottom>
				<template #activator="{ on }">
					<v-switch :label="$t('panel.settingsAppearance.disableAutoComplete')" hide-details v-model="disableAutoComplete" v-on="on"></v-switch>
				</template>
				{{ $t('panel.settingsAppearance.disableAutoCompleteTitle') }}
			</v-tooltip>
			<v-select :items="dashboardModes" :label="$t('panel.settingsAppearance.dashboardModeTitle')" class="mt-3" hide-details item-text="value" item-value="value" v-model="dashboardMode"></v-select>
			<v-switch :label="$t('panel.settingsAppearance.bottomNavigation')" hide-details v-model="bottomNavigation"></v-switch>
			<v-switch :label="$t('panel.settingsAppearance.numericInputs')" hide-details v-model="numericInputs"></v-switch>
			<v-switch :label="$t('panel.settingsAppearance.iconMenu')" hide-details v-model="iconMenu"></v-switch>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict';

import { mapState, mapMutations } from 'vuex'

import { DashboardMode } from '@/store/settings'

export default {
	computed: {
		...mapState(['settings']),
		darkTheme: {
			get() { return this.settings.darkTheme; },
			set(value) { this.update({ darkTheme: value }); }
		},
		language: {
			get() { return this.settings.language; },
			set(value) { this.update({language: value}); }
		},
		languages() {
			const result = [];
			for (let key in this.$i18n.messages) {
				result.push({code: key, language: this.$i18n.messages[key].language});
			}
			return result;
		},
		useBinaryPrefix: {
			get() { return this.settings.useBinaryPrefix; },
			set(value) { this.update({useBinaryPrefix: value}); }
		},
		disableAutoComplete: {
			get() { return this.settings.disableAutoComplete; },
			set(value) { this.update({disableAutoComplete: value}); }
		},
		dashboardMode: {
			get() {
				if (!this.settings.dashboardMode) {
					return DashboardMode.default;
				}
				return this.settings.dashboardMode;
			},
			set(value) {
				this.update({ dashboardMode: value });
			},
		},
		dashboardModes() {
			return Object.keys(DashboardMode).map((key) => {
				return { key, value: DashboardMode[key] };
			});
		},
		bottomNavigation: {
			get() { return this.settings.bottomNavigation; },
			set(value) { this.update({ bottomNavigation: value }); }
		},
		numericInputs: {
			get() { return this.settings.numericInputs; },
			set(value) { this.update({ numericInputs: value }); }
		},
		iconMenu: {
			get() { return this.settings.iconMenu; },
			set(value) { this.update({ iconMenu: value }); }
		},
	},
	methods: mapMutations('settings', ['update']),
};
</script>
