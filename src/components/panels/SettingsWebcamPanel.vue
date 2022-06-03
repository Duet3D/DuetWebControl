<template>
	<v-card outlined>
		<v-card-title class="pb-0">
			{{ $t('panel.settingsWebcam.caption') }}
		</v-card-title>

		<v-card-text>
			<v-row :dense="$vuetify.breakpoint.mobile">
				<v-col cols="12" md="6">
					<v-text-field v-model="webcamURL" :label="$t('panel.settingsWebcam.webcamURL')" hide-details></v-text-field>
				</v-col>
				<v-col cols="12" md="6">
					<v-text-field v-model.number="webcamUpdateInterval" type="number" step="1" min="250" :label="$t('panel.settingsWebcam.webcamUpdateInterval', ['ms'])" hide-details></v-text-field>
				</v-col>
				<v-col cols="12" md="12">
					<v-text-field v-model="webcamLiveURL" :label="$t('panel.settingsWebcam.webcamLiveURL')" hide-details></v-text-field>
				</v-col>
				<v-col cols="12" md="6">
					<v-switch v-model="webcamFix" :label="$t('panel.settingsWebcam.webcamFix')" hide-details></v-switch>
				</v-col>
				<v-col cols="12" md="6">
					<v-switch v-model="webcamEmbedded" :label="$t('panel.settingsWebcam.webcamEmbedded')" hide-details></v-switch>
				</v-col>
				<v-col cols="12" md="6">
					<v-select v-model="webcamRotation" :items="rotationItems" :label="$t('panel.settingsWebcam.webcamRotation')" hide-details></v-select>
				</v-col>
				<v-col cols="12" md="6">
					<v-select v-model="webcamFlip" :items="flipItems" :label="$t('panel.settingsWebcam.webcamFlip')" hide-details></v-select>
				</v-col>
			</v-row>
		</v-card-text>
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
			set(value) { if (this.isNumber(value) && (value <= 0 || value >= 250)) { this.update({ webcam: { updateInterval: value } }); } }
		},
		webcamLiveURL: {
			get() { return this.settings.webcam.liveUrl; },
			set(value) { this.update({ webcam: { liveUrl: value } }); }
		},
		webcamFix: {
			get() { return this.settings.webcam.useFix; },
			set(value) { this.update({ webcam: { useFix: value } }); }
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
