<template>
	<v-card>
		<v-card-title>
			<span>{{ $t('panel.settingsGeneral.caption') }}</span>
			<v-spacer></v-spacer>
			<a v-show="!uiFrozen" href="#" @click.prevent="showResetConfirmation = true">
				<v-icon small class="mr-1">restore</v-icon> {{ $t('panel.settingsGeneral.factoryReset') }}
			</a>
		</v-card-title>

		<v-container fluid grid-list-lg class="px-3">
			<v-layout row wrap align-center>
				<v-flex xs12 sm6>
					<v-switch v-model="settingsStorageLocal" :label="$t('panel.settingsGeneral.settingsStorageLocal')" :disabled="!supportsLocalStorage"></v-switch>
				</v-flex>
				<v-flex xs12 sm6>
					<v-text-field v-model.number="settingsSaveDelay" type="number" step="any" min="0" :label="$t('panel.settingsGeneral.settingsSaveDelay', ['ms'])"></v-text-field>
				</v-flex>
				<v-flex xs12 sm6>
					<v-switch v-model="cacheStorageLocal" :label="$t('panel.settingsGeneral.cacheStorageLocal')" :disabled="!supportsLocalStorage"></v-switch>
				</v-flex>
				<v-flex xs12 sm6>
					<v-text-field v-model.number="cacheSaveDelay" type="number" step="any" min="0" :label="$t('panel.settingsGeneral.cacheSaveDelay', ['ms'])"></v-text-field>
				</v-flex>
			</v-layout>
		</v-container>

		<confirm-dialog :shown.sync="showResetConfirmation" :question="$t('dialog.factoryReset.title')" :prompt="$t('dialog.factoryReset.prompt')" @confirmed="reset"></confirm-dialog>
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
