<template>
	<v-card>
		<v-card-title>
			<span>General Settings</span>
			<v-spacer></v-spacer>
			<a v-show="!uiFrozen" href="#" @click.prevent="showResetConfirmation = true">
				<v-icon small class="mr-1">restore</v-icon> Revert to Factory Defaults
			</a>
		</v-card-title>

		<v-container fluid grid-list-lg class="px-3">
			<v-layout row wrap align-center>
				<v-flex xs12 sm12 md6>
					<v-switch label="Dark theme" v-model="darkTheme"></v-switch>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-switch v-model="useBinaryPrefix" label="Use base of 1024 (IEC) instead of 1000 (SI) for file sizes"></v-switch>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-switch v-model="settingsStorageLocal" label="Save settings in local storage" :disabled="!supportsLocalStorage"></v-switch>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-text-field v-model.number="settingsSaveDelay" type="number" label="Update delay for settings changes (ms)" step="any" min="0"></v-text-field>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-switch v-model="cacheStorageLocal" label="Save cache in local storage" :disabled="!supportsLocalStorage"></v-switch>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-text-field v-model.number="cacheSaveDelay" type="number" label="Update delay for cache changes (ms)" step="any" min="0"></v-text-field>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-switch v-model="notificationErrorsPersistent" label="Do not close error messages automatically"></v-switch>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-text-field v-model.number="notificationTimeout" type="number" label="Notification timeout (ms)" step="any" min="0"></v-text-field>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-text-field v-model="webcamURL" label="Webcam URL (optional)"></v-text-field>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-text-field v-model="webcamUpdateInterval" label="Webcam update interval (ms)" step="1" min="250"></v-text-field>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-switch v-model="webcamFix" label="Do not append extra HTTP qulifier when reloading images"></v-switch>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-switch v-model="webcamEmbedded" label="Embed webcam image in an iframe"></v-switch>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-autocomplete v-model="webcamRotation" :items="rotationItems" label="Rotate webcam image" :disabled="webcamEmbedded"></v-autocomplete>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-autocomplete v-model="webcamFlip" :items="flipItems" label="Flip webcam image" :disabled="webcamEmbedded"></v-autocomplete>
				</v-flex>
			</v-layout>
		</v-container>

		<confirm-dialog :shown.sync="showResetConfirmation" question="Perform factory reset?" prompt="Are you sure you wish to perform a factory reset? All saved settings will be lost." @confirmed="reset"></confirm-dialog>
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
		useBinaryPrefix: {
			get() { return this.settings.useBinaryPrefix; },
			set(value) { this.update({ useBinaryPrefix: value }); }
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
		},
		notificationErrorsPersistent: {
			get() { return this.settings.notifications.errorsPersistent; },
			set(value) { this.update({ notifications: { errorsPersistent: value } }); }
		},
		notificationTimeout: {
			get() { return this.settings.notifications.timeout; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ notifications: { timeout: value } }); } }
		},
		webcamURL: {
			get() { return this.settings.webcam.url; },
			set(value) { this.update({ webcam: { url: value } }); }
		},
		webcamUpdateInterval: {
			get() { return this.settings.webcam.updateInterval; },
			set(value) { if (this.isNumber(value) && value >= 250) { this.update({ webcam: { updateInterval: value } }); } }
		},
		webcamFix: {
			get() { return this.settings.webcam.fix; },
			set(value) { this.update({ webcam: { fix: value } }); }
		},
		webcamEmbedded: {
			get() { return this.settings.webcam.embedded; },
			set(value) { this.update({ webcam: { embedded: value } }); }
		},
		webcamRotation: {
			get() { return this.settings.webcam.rotation; },
			set(value) { this.update({ webcam: { rotation: value } }); }
		},
		webcamFlip: {
			get() { return this.settings.webcam.flip; },
			set(value) { this.update({ webcam: { flip: value } }); }
		}
	},
	data() {
		return {
			rotationItems: [
				{ text: '0°', value: 0 },
				{ text: '90°', value: 90 },
				{ text: '180°', value: 180 },
				{ text: '270°', value: 270 }
			],
			flipItems: [
				{ text: 'None', value: 'none' },
				{ text: 'Flip X', value: 'x' },
				{ text: 'Flip Y', value: 'y' },
				{ text: 'Flip both', value: 'both' }
			],
			showResetConfirmation: false
		}
	},
	methods: {
		...mapActions('settings', ['reset']),
		...mapMutations('settings', ['update'])
	}
}
</script>
