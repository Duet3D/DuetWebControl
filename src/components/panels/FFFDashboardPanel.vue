<!-- FFF dashboard layout: movement + extrude/fan/ATX on the left, macros on the right. The fan panel
	 toggles between FansPanel (when there are thermostatic-or-tool fans worth listing) and the simpler
	 single-fan FanPanel; ATX is hidden unless the OM reports atxPower at all -->
<template>
	<v-row :dense="mobile">
		<v-col cols="12" sm="8" md="8" lg="9" xl="9">
			<MovementPanel class="mb-2" />

			<v-row>
				<v-col cols="12" :md="showATXPanel ? 9 : 12" :lg="showATXPanel ? 9 : 12" :xl="showATXPanel ? 10 : 12">
					<ExtrudePanel />
				</v-col>
				<v-col v-if="showATXPanel" md="3" lg="3" xl="2" align-self="center">
					<ATXPanel />
				</v-col>
			</v-row>

			<v-row>
				<v-col cols="12">
					<FansPanel v-if="showFansPanel" />
					<FanPanel v-else />
				</v-col>
			</v-row>
		</v-col>

		<v-col class="d-none d-sm-flex" sm="4" md="4" lg="3" xl="3">
			<MacroList />
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import ATXPanel from "@/components/panels/ATXPanel.vue";
import ExtrudePanel from "@/components/panels/ExtrudePanel.vue";
import FanPanel from "@/components/panels/FanPanel.vue";
import FansPanel from "@/components/panels/FansPanel.vue";
import MovementPanel from "@/components/panels/MovementPanel.vue";
import MacroList from "@/components/lists/MacroList.vue";
import { useMachineStore } from "@/stores/machine";

const { mobile } = useDisplay();
const machineStore = useMachineStore();

const showATXPanel = computed(() => machineStore.model.state.atxPower !== null);

// Show the multi-row FansPanel when the user has any thermostatic-fan-free RRF fans to control or the
// active tool brings its own fans; otherwise stick to the lean single-fan view
const showFansPanel = computed(() => {
	const tool = machineStore.currentTool;
	if (tool && tool.fans.length > 0) {
		return true;
	}
	return machineStore.model.fans.some(fan => fan !== null && fan.thermostatic.sensors.length === 0);
});
</script>
