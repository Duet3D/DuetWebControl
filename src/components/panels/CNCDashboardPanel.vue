<template>
	<v-row>
		<v-col cols="12" class="pt-0 pb-0">
			<MovementPanel cnc class="mb-2" />
		</v-col>

		<v-col cols="12" md="9">
			<v-row density="compact">
				<v-col v-if="!uiStore.isLaser" cols="12">
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
					<BabystepPanel class="fill-height" />
				</v-col>
				<v-col cols="4" class="flex-grow-1">
					<SpeedFactorPanel class="fill-height" />
				</v-col>
			</v-row>
		</v-col>

		<v-col v-if="mdAndUp" class="d-flex flex-column" md="3">
			<div class="macros-wrap">
				<MacroList />
			</div>
		</v-col>
	</v-row>
</template>

<style scoped>
.macros-wrap {
	display: flex;
	flex-direction: column;
	flex: 1 1 0;
	min-height: 0;
}
</style>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import MovementPanel from "@/components/panels/MovementPanel.vue";
import JobControlPanel from "@/components/panels/JobControlPanel.vue";
import JobProgress from "@/components/misc/JobProgress.vue";
import MacroList from "@/components/lists/MacroList.vue";
import SpeedFactorPanel from "@/components/panels/SpeedFactorPanel.vue";
import SpindleSpeedPanel from "@/components/panels/SpindleSpeedPanel.vue";
import BabystepPanel from "@/components/panels/BabystepPanel.vue";
import { useUiStore } from "@/stores/ui";

const { mdAndUp } = useDisplay();
const uiStore = useUiStore();
</script>
