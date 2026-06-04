<template>
	<component :is="activeShell" />
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import BuiltInShell from "@/layouts/builtin.vue";
import i18n from "@/i18n";
import { registeredLayout } from "@/plugins/layout";
import { useSettingsStore } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import Events from "@/utils/events";

const settingsStore = useSettingsStore();
const uiStore = useUiStore();
const route = useRoute();
const router = useRouter();

const activeShell = computed(() => {
	if (settingsStore.useCustomLayout && registeredLayout.value) {
		return registeredLayout.value;
	}
	return BuiltInShell;
});

// The watcher fires only on toggles, not on first mount, because activeShell is a derived computed.
// Force a clean remount on swap to drop any keep-alive cache from the previous shell and to reset
// scroll - vue-router scrollBehavior runs on navigation, not on this in-place component swap
watch(activeShell, () => {
	window.scrollTo(0, 0);
	router.replace(route.fullPath);
});

onMounted(() => {
	Events.on("dwcPluginsLoaded", () => {
		if (settingsStore.useCustomLayout && !registeredLayout.value) {
			// System-initiated recovery: the user opted into a custom layout but no plugin registered
			// one this session. The Settings button is hidden when no custom layout is registered,
			// so the user would have no UI to clear the stale preference. Clearing layoutUserSet
			// lets takeoverOnFirstLoad restore the layout automatically if the plugin returns next boot
			settingsStore.useCustomLayout = false;
			settingsStore.layoutUserSet = false;
			uiStore.log(LogLevel.warning, i18n.global.t("layout.customLayoutMissing"));
		}
	});
});
</script>
