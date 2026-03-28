<!-- Always-visible global status panel for FFF dashboards (md+). Composes StatusPanel for now;
	 ToolsPanel + TemperatureChart land in follow-up commits (TemperatureChart needs chart.js as a new dep) -->
<template>
	<v-row :dense="mobile">
		<v-col cols="12" sm="6" md="4" lg="4" xl="4">
			<StatusPanel />
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";

const { mobile } = useDisplay();
</script>
