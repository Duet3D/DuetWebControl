<template>
	<v-card>
		<v-card-title>
			{{ $t('panel.settingsWebcam.caption') }}
		</v-card-title>

		<v-container fluid grid-list-lg class="px-3">
			<v-layout row wrap align-center>
				<v-flex xs12 sm12 md6>
					<v-text-field v-model="webcamURL" :label="$t('panel.settingsWebcam.webcamURL')"></v-text-field>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-text-field v-model="webcamUpdateInterval" type="number" step="1" min="250" :label="$t('panel.settingsWebcam.webcamUpdateInterval', ['ms'])"></v-text-field>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-switch v-model="webcamFix" :label="$t('panel.settingsWebcam.webcamFix')"></v-switch>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-switch v-model="webcamEmbedded" :label="$t('panel.settingsWebcam.webcamEmbedded')"></v-switch>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-select v-model="webcamRotation" :items="rotationItems" :label="$t('panel.settingsWebcam.webcamRotation')" :disabled="webcamEmbedded"></v-select>
				</v-flex>
				<v-flex xs12 sm12 md6>
					<v-select v-model="webcamFlip" :items="flipItems" :label="$t('panel.settingsWebcam.webcamFlip')" :disabled="webcamEmbedded"></v-select>
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
		flipItems() {
			return [
				{ text: this.$t('panel.settingsWebcam.flipNone'), value: 'none' },
				{ text: this.$t('panel.settingsWebcam.flipX'), value: 'x' },
				{ text: this.$t('panel.settingsWebcam.flipY'), value: 'y' },
				{ text: this.$t('panel.settingsWebcam.flipBoth'), value: 'both' }
			];
		},
		webcamURL: {
			get() { return this.settings.webcam.url; },
			set(value) { this.update({ webcam: { url: value } }); }
		},
		webcamUpdateInterval: {
			get() { return this.settings.webcam.updateInterval; },
			set(value) {
		        	value = parseInt(value);  
				if (!isNaN(value) && (value >= 250 || value === 0)) { 
					this.update({ webcam: { updateInterval: value } }); } 
				}
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
			]
		}
	},
	methods: mapMutations('settings', ['update'])
}
</script>
