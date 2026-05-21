<route lang="json">
{
	"meta": {
		"menu": {
			"category": "job",
			"icon": "mdi-information",
			"caption": "menu.job.status",
			"order": 10,
			"badgeKey": "jobProgress"
		}
	}
}
</route>

<template>
	<div class="d-flex flex-column">
		<JobProgress class="px-3 px-md-0 pt-1 pt-md-0" />

		<v-row class="mt-0" :density="mobile ? 'compact' : 'default'">
			<v-col cols="12" sm="6" md="3" xl="2" class="order-1 order-md-1">
				<v-row :density="mobile ? 'compact' : 'default'" class="align-center">
					<v-col cols="12">
						<JobControlPanel />
					</v-col>
					<v-col cols="12">
						<ZBabystepPanel />
					</v-col>
					<v-col class="d-none d-md-block">
						<JobInfoPanel />
					</v-col>
					<v-col cols="12" class="d-none d-sm-block d-md-none">
						<SpeedFactorPanel />
					</v-col>
					<v-col v-if="uiStore.isFFF" cols="12" class="d-none d-sm-block d-md-none">
						<ExtrusionFactorsPanel />
					</v-col>
				</v-row>
			</v-col>

			<v-col cols="12" md="5" xl="7" class="d-none d-sm-flex flex-column order-0 order-md-2">
				<LayerChart v-if="uiStore.isFFF" class="chart-height-limit mb-0 mb-md-5" />

				<v-row class="flex-grow-0 flex-shrink-1 d-none d-md-flex">
					<v-col cols="12">
						<JobEstimationsPanel />
					</v-col>
					<v-col cols="12">
						<JobDataPanel />
					</v-col>
				</v-row>

				<v-row class="flex-grow-0 flex-shrink-1 d-flex d-sm-none mt-3">
					<v-col cols="6" md="6">
						<FansPanel />
					</v-col>
					<v-col cols="6" md="6">
						<SpeedFactorPanel />
					</v-col>
				</v-row>
			</v-col>

			<v-col cols="12" sm="6" md="4" xl="3" class="order-2 order-md-3">
				<v-row :density="mobile ? 'compact' : 'default'">
					<v-col cols="12" class="d-block d-md-none">
						<JobEstimationsPanel />
					</v-col>
					<v-col cols="12" class="d-block d-md-none">
						<JobDataPanel />
					</v-col>
					<v-col cols="12" class="d-block d-md-none">
						<JobInfoPanel />
					</v-col>
					<v-col cols="12" class="d-block d-sm-none d-md-block">
						<SpeedFactorPanel />
					</v-col>
					<v-col cols="12">
						<FansPanel />
					</v-col>
					<v-col v-if="uiStore.isFFF" cols="12" class="d-block d-sm-none d-md-block">
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
import LayerChart from "@/components/charts/LayerChart.vue";
import { useUiStore } from "@/stores/ui";

const { mobile } = useDisplay();
const uiStore = useUiStore();
</script>
