<template>
	<v-card outlined>
		<v-card-title class="pb-0">
			{{ $t("panel.settingsWebcam.caption") }}
		</v-card-title>

		<v-card-text>
			<v-row :dense="$vuetify.display.mobile">
				<v-col cols="12">
					<v-switch v-model="webcamEnabled" :label="$t('panel.settingsWebcam.enable')" hide-details />
				</v-col>
				<v-col cols="12" md="6">
					<v-text-field v-model="webcamURL" :label="$t('panel.settingsWebcam.webcamURL')" hide-details />
				</v-col>
				<v-col cols="12" md="6">
					<v-text-field v-model.number="webcamUpdateInterval" type="number" step="1" min="250"
								  :label="$t('panel.settingsWebcam.webcamUpdateInterval', ['ms'])" hide-details />
				</v-col>
				<v-col cols="12" md="12">
					<v-text-field v-model="webcamLiveURL" :label="$t('panel.settingsWebcam.webcamLiveURL')"
								  hide-details />
				</v-col>
				<v-col cols="12" md="6">
					<v-switch v-model="webcamFix" :label="$t('panel.settingsWebcam.webcamFix')" hide-details />
				</v-col>
				<v-col cols="12" md="6">
					<v-switch v-model="webcamEmbedded" :label="$t('panel.settingsWebcam.webcamEmbedded')"
							  hide-details />
				</v-col>
				<v-col cols="12" md="6">
					<v-select v-model="webcamRotation" :items="rotationItems"
							  :label="$t('panel.settingsWebcam.webcamRotation')" hide-details />
				</v-col>
				<v-col cols="12" md="6">
					<v-select v-model="webcamFlip" :items="flipItems" :label="$t('panel.settingsWebcam.webcamFlip')"
							  hide-details />
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { useSettingsStore, WebcamFlip } from "@/store/settings";

export default defineComponent({
	computed: {
		webcamEnabled: {
			get(): boolean { return useSettingsStore().webcam.enabled; },
			set(value: boolean) { useSettingsStore().webcam.enabled = value }
		},
		webcamURL: {
			get(): string { return useSettingsStore().webcam.url; },
			set(value: string) { useSettingsStore().webcam.url = value; }
		},
		webcamUpdateInterval: {
			get(): number { return useSettingsStore().webcam.updateInterval; },
			set(value: number) { if (isFinite(value) && (value <= 0 || value >= 250)) { useSettingsStore().webcam.updateInterval = value; } }
		},
		webcamLiveURL: {
			get(): string { return useSettingsStore().webcam.liveUrl; },
			set(value: string) { useSettingsStore().webcam.liveUrl = value; }
		},
		webcamFix: {
			get(): boolean { return useSettingsStore().webcam.useFix; },
			set(value: boolean) { useSettingsStore().webcam.useFix = value; }
		},
		webcamEmbedded: {
			get(): boolean { return useSettingsStore().webcam.embedded; },
			set(value: boolean) { useSettingsStore().webcam.embedded = value; }
		},
		webcamRotation: {
			get(): number { return useSettingsStore().webcam.rotation; },
			set(value: number) { useSettingsStore().webcam.rotation = value; }
		},
		webcamFlip: {
			get(): WebcamFlip { return useSettingsStore().webcam.flip; },
			set(value: WebcamFlip) { useSettingsStore().webcam.flip = value; }
		}
	},
	data() {
		return {
			rotationItems: [
				{ text: "0°", value: 0 },
				{ text: "90°", value: 90 },
				{ text: "180°", value: 180 },
				{ text: "270°", value: 270 }
			],
			flipItems: [
				{ text: this.$t("panel.settingsWebcam.flipNone"), value: WebcamFlip.None },
				{ text: this.$t("panel.settingsWebcam.flipX"), value: WebcamFlip.X },
				{ text: this.$t("panel.settingsWebcam.flipY"), value: WebcamFlip.Y },
				{ text: this.$t("panel.settingsWebcam.flipBoth"), value: WebcamFlip.Both }
			]
		};
	}
});
</script>
