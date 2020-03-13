<template>
	<v-card>
		<v-card-title class="pb-0">
			{{ $t('panel.settingsGeneral.caption') }}
			<v-spacer></v-spacer>
			<a v-show="!uiFrozen" href="javascript:void(0)" @click="showResetConfirmation = true">
				<v-icon small class="mr-1">mdi-restore</v-icon> {{ $t('panel.settingsGeneral.factoryReset') }}
			</a>
		</v-card-title>

		<v-card-text>
			<v-row>
				<v-col cols="12" sm="6">
					<v-switch v-model="settingsStorageLocal" :label="$t('panel.settingsGeneral.settingsStorageLocal')" :disabled="!supportsLocalStorage" hide-details></v-switch>
				</v-col>
				<v-col cols="12" sm="6">
					<v-text-field v-model.number="settingsSaveDelay" type="number" step="any" min="0" :label="$t('panel.settingsGeneral.settingsSaveDelay', ['ms'])" hide-details></v-text-field>
				</v-col>
				<v-col cols="12" sm="6">
					<v-switch v-model="cacheStorageLocal" :label="$t('panel.settingsGeneral.cacheStorageLocal')" :disabled="!supportsLocalStorage" hide-details></v-switch>
				</v-col>
				<v-col cols="12" sm="6">
					<v-text-field v-model.number="cacheSaveDelay" type="number" step="any" min="0" :label="$t('panel.settingsGeneral.cacheSaveDelay', ['ms'])" hide-details></v-text-field>
				</v-col>
			</v-row>
		</v-card-text>

		<confirm-dialog :shown.sync="showResetConfirmation" :title="$t('dialog.factoryReset.title')" :prompt="$t('dialog.factoryReset.prompt')" @confirmed="reset"></confirm-dialog>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

import { localStorageSupported } from '../../utils/localStorage.js'

export default {
	computed: {
		...mapState(['settings']),
		...mapGetters(['uiFrozen']),
		supportsLocalStorage() { return localStorageSupported; },
		darkTheme: {
			get() { return this.settings.darkTheme; },
			set(value) { this.update({ darkTheme: value }); }
		},
		settingsStorageLocal: {
			get() { return this.settings.settingsStorageLocal; },
			set(value) { this.update({ settingsStorageLocal: value }); }
		},
		settingsSaveDelay: {
			get() { return this.settings.settingsSaveDelay; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ settingsSaveDelay: value }); } }
		},
		cacheStorageLocal: {
			get() { return this.settings.cacheStorageLocal; },
			set(value) { this.update({ cacheStorageLocal: value }); }
		},
		cacheSaveDelay: {
			get() { return this.settings.cacheSaveDelay; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ cacheSaveDelay: value }); } }
		}
	},
	data() {
		return {
			showResetConfirmation: false
		}
	},
	methods: {
		...mapActions('settings', ['reset']),
		...mapMutations('settings', ['update'])
	}
}
</script>
