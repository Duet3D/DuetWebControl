<template>
	<v-card>
		<v-card-title>
			{{ $t('panel.settingsAppearance.caption') }}
		</v-card-title>

		<v-card-text class="d-flex flex-column">
			<v-switch v-model="darkTheme" :label="$t('panel.settingsAppearance.darkTheme')" hide-details class="mt-0 mb-3"></v-switch>
			<v-select v-model="language" :items="languages" item-text="language" item-value="code" :return-object="false" :label="$t('panel.settingsAppearance.language')" hide-details></v-select>
			<v-tooltip bottom>
				<template #activator="{ on }">
					<v-switch v-model="useBinaryPrefix" v-on="on" :label="$t('panel.settingsAppearance.binaryFileSizes')" hide-details></v-switch>
				</template>
				{{ $t('panel.settingsAppearance.binaryFileSizesTitle') }}
			</v-tooltip>
			<v-tooltip bottom>
				<template #activator="{ on }">
					<v-switch v-model="disableAutoComplete" v-on="on" :label="$t('panel.settingsAppearance.disableAutoComplete')" hide-details></v-switch>
				</template>
				{{ $t('panel.settingsAppearance.disableAutoCompleteTitle') }}
			</v-tooltip>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState(['settings']),
		darkTheme: {
			get() { return this.settings.darkTheme; },
			set(value) { this.update({ darkTheme: value }); }
		},
		language: {
			get() { return this.settings.language; },
			set(value) { this.update({ language: value }); }
		},
		languages() {
			const result = [];
			for (let key in this.$i18n.messages) {
				result.push({ code: key, language: this.$i18n.messages[key].language });
			}
			return result;
		},
		useBinaryPrefix: {
			get() { return this.settings.useBinaryPrefix; },
			set(value) { this.update({ useBinaryPrefix: value }); }
		},
		disableAutoComplete: {
			get() { return this.settings.disableAutoComplete; },
			set(value) { this.update({ disableAutoComplete: value }); }
		}
	},
	methods: mapMutations('settings', ['update'])
}
</script>
