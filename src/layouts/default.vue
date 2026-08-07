<template>
	<component :is="activeShell" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import BuiltInShell from "@/layouts/builtin.vue";
import i18n from "@/i18n";
import { useSettingsStore } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import Events from "@/utils/events";

const settingsStore = useSettingsStore();
const uiStore = useUiStore();
const route = useRoute();
const router = useRouter();

const activeShell = computed(() => uiStore.activeLayout?.component ?? BuiltInShell);

// The watcher fires only on toggles, not on first mount, because activeShell is a derived computed.
// Force a clean remount on swap to drop any keep-alive cache from the previous shell and to reset
// scroll - vue-router scrollBehavior runs on navigation, not on this in-place component swap
watch(activeShell, () => {
	window.scrollTo(0, 0);
	router.replace(route.fullPath);
});

// Firefox reports wheel deltas in lines and pages rather than pixels
function pixelDelta(e: WheelEvent): number {
	switch (e.deltaMode) {
		case WheelEvent.DOM_DELTA_LINE:
			return e.deltaY * 16;
		case WheelEvent.DOM_DELTA_PAGE:
			return e.deltaY * window.innerHeight;
		default:
			return e.deltaY;
	}
}

// A viewport-filling panel starts below the status row, so its bottom edge hangs below the fold
// until the page is scrolled down by the height of that row. Scrolling on such a panel would
// otherwise scroll its content while part of it stays out of sight, hence scroll input is routed
// to the page until the panel is flush and to the panel afterwards - the inverse of the browser's
// own scroll chaining. Only as much of each delta as the panel still hangs below the fold is
// taken, so a touchpad fling spends a few pixels on getting there and keeps the rest of its
// momentum for the content. Listening in the bubble phase leaves panels that consume the wheel
// themselves (the G-code viewer zoom) alone
function onWheel(e: WheelEvent) {
	if (!settingsStore.behaviour.scrollPanelIntoView || e.defaultPrevented || e.deltaY <= 0 || e.ctrlKey) {
		return;
	}

	const panel = (e.target instanceof Element) ? e.target.closest(".dwc-page-fill") : null;
	if (panel === null) {
		return;
	}

	const overflow = panel.getBoundingClientRect().bottom - window.innerHeight;
	if (overflow > 1) {
		e.preventDefault();
		window.scrollBy(0, Math.min(pixelDelta(e), overflow));
	}
}

onMounted(() => {
	window.addEventListener("wheel", onWheel, { passive: false });

	Events.on("dwcPluginsLoaded", () => {
		if (settingsStore.useCustomLayout && !uiStore.activeLayout) {
			// System-initiated recovery: the user opted into a custom layout but no matching plugin
			// registered one this session. The switcher is hidden when no custom layout is registered,
			// so the user would have no UI to clear the stale preference. Clearing layoutUserSet
			// lets takeoverOnFirstLoad restore the layout automatically if the plugin returns next boot
			settingsStore.useCustomLayout = false;
			settingsStore.activeLayoutId = null;
			settingsStore.layoutUserSet = false;
			uiStore.log(LogLevel.warning, i18n.global.t("layout.customLayoutMissing"));
		}
	});
});

onBeforeUnmount(() => {
	window.removeEventListener("wheel", onWheel);
});
</script>
