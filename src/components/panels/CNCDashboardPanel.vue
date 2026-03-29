<!-- CNC dashboard layout: CNCMovementPanel up top, spindle/job/babystep/speed in the main column,
	 macros on the right. Mirrors v3.7-dev's CNCDashboardPanel structure -->
<template>
	<v-row>
		<v-col cols="12" class="pt-0 pb-0">
			<CNCMovementPanel class="mb-2" />
		</v-col>

		<v-col cols="12" md="9">
			<v-row dense>
				<v-col cols="12">
					<SpindleSpeedPanel />
				</v-col>
				<v-col cols="12">
					<v-card>
						<v-card-text>
							<JobProgress />
						</v-card-text>
					</v-card>
				</v-col>
				<v-col cols="4" class="flex-grow-1">
					<JobControlPanel />
				</v-col>
				<v-col cols="4" class="flex-grow-1">
					<ZBabystepPanel class="fill-height" />
				</v-col>
				<v-col cols="4" class="flex-grow-1">
					<SpeedFactorPanel class="fill-height" />
				</v-col>
			</v-row>
		</v-col>

		<v-col cols="12" md="3">
			<v-row dense>
				<MacroList class="macro" />
			</v-row>
		</v-col>
	</v-row>
</template>

<style scoped>
.macro {
	width: 100%;
}
</style>

<script setup lang="ts">
import CNCMovementPanel from "@/components/panels/CNCMovementPanel.vue";
import JobControlPanel from "@/components/panels/JobControlPanel.vue";
import JobProgress from "@/components/misc/JobProgress.vue";
import MacroList from "@/components/lists/MacroList.vue";
import SpeedFactorPanel from "@/components/panels/SpeedFactorPanel.vue";
import SpindleSpeedPanel from "@/components/panels/SpindleSpeedPanel.vue";
import ZBabystepPanel from "@/components/panels/ZBabystepPanel.vue";
</script>
