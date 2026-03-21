<!-- Root of the application: hosts <router-view> via the layout system (see src/layouts/) -->
<!-- The Vuetify <v-app> wrapper lives in the layouts so they can drive Vuetify's drawer/app-bar wiring -->
<template>
	<router-view />
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";

const machineStore = useMachineStore();

// Attempt to connect straight away unless running in dev mode
if (process.env.NODE_ENV !== "development") {
	/*await*/ machineStore.connect();
}
</script>
