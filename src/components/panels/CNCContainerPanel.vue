<template>
	<v-row :density="mobile ? 'compact' : 'default'">
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
