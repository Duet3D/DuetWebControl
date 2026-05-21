<template>
	<v-row :density="mobile ? 'compact' : 'default'">
		<v-col cols="12" md="8" lg="8" xl="9">
			<MovementPanel class="mb-4" />

			<v-row :density="mobile ? 'compact' : 'default'">
				<v-col cols="12" :md="showATXPanel ? 9 : 12" :lg="showATXPanel ? 9 : 12" :xl="showATXPanel ? 10 : 12">
					<ExtrudePanel />
				</v-col>
				<v-col v-if="showATXPanel" md="3" lg="3" xl="2" class="align-self-center">
					<ATXPanel />
				</v-col>
				<v-col cols="12">
					<FanPanel />
				</v-col>
			</v-row>
		</v-col>

		<v-col v-if="mdAndUp" class="d-flex flex-column" md="4" lg="4" xl="3">
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

import ATXPanel from "@/components/panels/ATXPanel.vue";
import ExtrudePanel from "@/components/panels/ExtrudePanel.vue";
import FanPanel from "@/components/panels/FanPanel.vue";
import MovementPanel from "@/components/panels/MovementPanel.vue";
import MacroList from "@/components/lists/MacroList.vue";
import { useMachineStore } from "@/stores/machine";

const { mobile, mdAndUp } = useDisplay();
const machineStore = useMachineStore();

const showATXPanel = computed(() => machineStore.model.state.atxPower !== null);
</script>
