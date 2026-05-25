<template>
	<div />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import { useSettingsStore } from "@/stores/settings";

// Magic-URL escape hatch for unlocked custom layouts: flips the user back to the built-in
// shell and redirects to the dashboard. Locked layouts never reach this page because the
// route guard in src/plugins/layout.ts redirects non-overridden paths to / while the lock
// is active. layoutUserSet is set so a subsequent plugin load with takeoverOnFirstLoad does
// not immediately undo this explicit reset
const settings = useSettingsStore();
const router = useRouter();

onMounted(() => {
	settings.useCustomLayout = false;
	settings.layoutUserSet = true;
	router.replace("/");
});
</script>
