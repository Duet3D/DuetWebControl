<!-- Always-visible global status panel for CNC dashboards (md+). The full v3.7-dev CNC view (with separate
	 speed cards, sensor card and machine + tool position rows) lands in a follow-up commit; the basics here
	 give CNC users the same StatusPanel as FFF plus the large tool-position display -->
<template>
	<v-row :dense="mobile">
		<v-col cols="12" md="6">
			<StatusPanel />
		</v-col>
		<v-col cols="12" md="6">
			<CNCAxesPosition :machine-position="false" />
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";

const { mobile } = useDisplay();
</script>
