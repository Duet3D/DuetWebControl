<!-- Status overview for the active job. Left column = controls + babysteps + job info, middle = layer
	 chart + estimations/data, right = factors + fans. Layout mirrors v3.7-dev's Job/Status route -->
<route lang="json">
{
	"meta": {
		"menu": {
			"category": "job",
			"icon": "mdi-information-variant",
			"caption": "menu.job.status",
			"order": 10
		}
	}
}
</route>

<template>
	<div class="d-flex flex-column">
		<JobProgress />

		<v-row class="mt-0" :dense="mobile">
			<v-col order="1" order-md="1" cols="12" sm="6" md="3" xl="2">
				<v-row align="center" :dense="mobile">
					<v-col cols="12">
						<JobControlPanel />
					</v-col>
					<v-col cols="12">
						<ZBabystepPanel />
					</v-col>
					<v-col class="hidden-sm-and-down">
						<JobInfoPanel />
					</v-col>
					<v-col cols="12" class="d-none d-sm-block d-md-none">
						<SpeedFactorPanel />
					</v-col>
					<v-col cols="12" class="d-none d-sm-block d-md-none">
						<ExtrusionFactorsPanel />
					</v-col>
				</v-row>
			</v-col>

			<v-col order="0" order-md="2" cols="12" md="5" xl="7" class="d-none d-sm-flex flex-column">
				<LayerChart class="chart-height-limit mb-5" />

				<v-row class="flex-grow-0 flex-shrink-1 d-none d-md-flex">
					<v-col cols="12">
						<JobEstimationsPanel />
					</v-col>
					<v-col cols="12">
						<JobDataPanel />
					</v-col>
				</v-row>

				<v-row class="flex-grow-0 flex-shrink-1 hidden-sm-and-up mt-3">
					<v-col cols="6" md="6">
						<FansPanel />
					</v-col>
					<v-col cols="6" md="6">
						<SpeedFactorPanel />
					</v-col>
				</v-row>
			</v-col>

			<v-col order="2" order-md="3" cols="12" sm="6" md="4" xl="3">
				<v-row :dense="mobile">
					<v-col cols="12" class="hidden-md-and-up">
						<JobEstimationsPanel />
					</v-col>
					<v-col cols="12" class="hidden-md-and-up">
						<JobDataPanel />
					</v-col>
					<v-col cols="12" class="hidden-md-and-up">
						<JobInfoPanel />
					</v-col>
					<v-col cols="12" class="hidden-sm-only">
						<SpeedFactorPanel />
					</v-col>
					<v-col cols="12">
						<FansPanel />
					</v-col>
					<v-col cols="12" class="hidden-sm-only">
						<ExtrusionFactorsPanel />
					</v-col>
				</v-row>
			</v-col>
		</v-row>
	</div>
</template>

<style scoped>
.chart-height-limit {
	max-height: 320px;
}
</style>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import ExtrusionFactorsPanel from "@/components/panels/ExtrusionFactorsPanel.vue";
import FansPanel from "@/components/panels/FansPanel.vue";
import JobControlPanel from "@/components/panels/JobControlPanel.vue";
import JobDataPanel from "@/components/panels/JobDataPanel.vue";
import JobEstimationsPanel from "@/components/panels/JobEstimationsPanel.vue";
import JobInfoPanel from "@/components/panels/JobInfoPanel.vue";
import SpeedFactorPanel from "@/components/panels/SpeedFactorPanel.vue";
import ZBabystepPanel from "@/components/panels/ZBabystepPanel.vue";
import JobProgress from "@/components/misc/JobProgress.vue";

// Chart.js is heavy; defer until the route mounts (matches the dashboard's TemperatureChart approach)
const LayerChart = defineAsyncComponent(() => import("@/components/charts/LayerChart.vue"));

const { mobile } = useDisplay();
</script>
