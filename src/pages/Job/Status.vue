<route lang="json">
{
	"meta": {
		"pageFill": true,
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
	<div class="d-flex flex-column" :class="{ 'dwc-page-fill overflow-y-auto': mdAndUp }">
		<div v-if="!mdAndUp" class="d-flex flex-column flex-shrink-0 mobile-first-screen">
			<JobProgress class="px-3 pt-1 flex-grow-0 flex-shrink-0" />
			<JobViewPanel v-if="machineStore.model.job.file !== null || !machineStore.isConnected"
						  class="flex-grow-1" />
		</div>
		<JobProgress v-else class="px-md-0 pt-md-0 flex-grow-0 flex-shrink-0" />

		<v-row v-if="mdAndUp" class="panel-grid mt-0 flex-grow-1"
			   :density="mobile ? 'compact' : 'default'">
			<v-col cols="12" md="3" xl="2" class="d-flex flex-column overflow-y-auto order-md-1">
				<v-row class="align-content-start" :density="mobile ? 'compact' : 'default'">
					<v-col cols="12">
						<JobControlPanel />
					</v-col>
					<v-col cols="12">
						<BabystepPanel />
					</v-col>
					<v-col cols="12">
						<JobInfoPanel />
					</v-col>
				</v-row>
			</v-col>

			<!-- Job view + Job times. At xs/sm JobViewPanel lives in the mobile-first-screen
				 wrapper above so it can flex to the viewport bottom -->
			<v-col cols="12" md="5" xl="7" class="d-flex flex-column overflow-y-auto order-md-2">
				<JobViewPanel v-if="machineStore.model.job.file !== null || !machineStore.isConnected"
							  class="mb-2 mb-lg-6 job-view-panel" />

				<v-row class="flex-grow-0 flex-shrink-0" :density="mobile ? 'compact' : 'default'">
					<v-col cols="12">
						<JobTimesPanel />
					</v-col>
				</v-row>
			</v-col>

			<v-col cols="12" md="4" xl="3" class="d-flex flex-column overflow-y-auto order-md-3">
				<v-row class="align-content-start" :density="mobile ? 'compact' : 'default'">
					<v-col cols="12">
						<SpeedFactorPanel />
					</v-col>
					<v-col cols="12">
						<FansPanel />
					</v-col>
					<v-col v-if="uiStore.isFFF" cols="12">
						<ExtrusionFactorsPanel />
					</v-col>
				</v-row>
			</v-col>
		</v-row>

		<!-- xs/sm: panels flow into one column at xs and two columns at sm (CSS multicol),
			 so each column packs tight and no row-aligned gaps appear between mismatched panels -->
		<div v-else class="sm-panel-grid mt-2">
			<JobControlPanel class="sm-panel" />
			<JobTimesPanel class="sm-panel" />
			<JobInfoPanel class="sm-panel" />
			<BabystepPanel class="sm-panel" />
			<SpeedFactorPanel class="sm-panel" />
			<ExtrusionFactorsPanel v-if="uiStore.isFFF" class="sm-panel" />
			<FansPanel class="sm-panel" />
		</div>
	</div>
</template>

<style scoped>
.panel-grid {
	min-height: 0;
}

@media (max-width: 839px) {
	.mobile-first-screen {
		min-height: calc(100dvh - var(--v-layout-top, 64px));
	}
}

.sm-panel {
	display: block;
	margin-bottom: 8px;
}

.sm-panel:last-child {
	margin-bottom: 0;
}

@media (min-width: 600px) and (max-width: 839px) {
	.sm-panel-grid {
		column-count: 2;
		column-gap: 8px;
	}
	.sm-panel {
		break-inside: avoid;
	}
}
</style>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import ExtrusionFactorsPanel from "@/components/panels/ExtrusionFactorsPanel.vue";
import FansPanel from "@/components/panels/FansPanel.vue";
import JobControlPanel from "@/components/panels/JobControlPanel.vue";
import JobInfoPanel from "@/components/panels/JobInfoPanel.vue";
import JobTimesPanel from "@/components/panels/JobTimesPanel.vue";
import JobViewPanel from "@/components/panels/JobViewPanel/JobViewPanel.vue";
import SpeedFactorPanel from "@/components/panels/SpeedFactorPanel.vue";
import BabystepPanel from "@/components/panels/BabystepPanel.vue";
import JobProgress from "@/components/misc/JobProgress.vue";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const { mdAndUp, mobile } = useDisplay();
const machineStore = useMachineStore();
const uiStore = useUiStore();
</script>
