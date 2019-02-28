<template>
	<v-card>
		<v-card-title>
			{{ $t('panel.settingsAppearance.caption') }}
		</v-card-title>

		<v-container fluid grid-list-lg class="px-3">
			<v-layout column>
				<v-flex>
					<v-switch v-model="darkTheme" :label="$t('panel.settingsAppearance.darkTheme')" hide-details class="mt-0"></v-switch>
				</v-flex>
				<v-flex>
					<v-select v-model="language" :items="languages" item-text="language" item-value="code" :return-object="false" :label="$t('panel.settingsAppearance.language')" hide-details></v-select>
				</v-flex>
				<v-flex>
					<v-switch v-model="useBinaryPrefix" :label="$t('panel.settingsAppearance.binaryFileSizes')" :title="$t('panel.settingsAppearance.binaryFileSizesTitle')"></v-switch>
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
		}
	},
	methods: mapMutations('settings', ['update'])
}
</script>
