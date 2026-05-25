<route lang="json">
{
	"meta": {
		"pageFill": true,
		"menu": {
			"category": "job",
			"icon": "mdi-webcam",
			"caption": "menu.job.webcam",
			"order": 20,
			"conditionKey": "webcamEnabled"
		}
	}
}
</route>

<template>
	<v-row :density="mobile ? 'compact' : 'default'" class="dwc-page-fill ma-0">
		<v-col class="pa-0">
			<WebcamPanel class="h-100" />
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import WebcamPanel from "@/components/panels/WebcamPanel.vue";

const { mobile } = useDisplay();
</script>
