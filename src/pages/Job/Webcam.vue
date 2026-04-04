<!-- Single-panel route that hosts the WebcamPanel under the Job menu category -->
<route lang="json">
{
	"meta": {
		"menu": {
			"category": "job",
			"icon": "mdi-webcam",
			"caption": "menu.job.webcam",
			"order": 20
		}
	}
}
</route>

<template>
	<v-row :dense="mobile">
		<v-col>
			<WebcamPanel />
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import WebcamPanel from "@/components/panels/WebcamPanel.vue";

const { mobile } = useDisplay();
</script>
