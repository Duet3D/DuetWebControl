import { computed } from "vue";
import { useDisplay } from "vuetify";

import { useSettingsStore } from "@/stores/settings";

// At the sm breakpoint with the largeButtons setting on, the app bar, page-level toolbars,
// the dashboard panels and dropdown/context menus swap to finger-friendly sizing for small
// touchscreens. Consumers read `large` (boolean) for class/density tweaks, `btnSize` (Vuetify
// v-btn size token, undefined outside the active state) to drive button sizing, and
// `controlDensity` to relax compact toolbars and menu lists to default density when active
export function useLargeButtons() {
	const settingsStore = useSettingsStore();
	const { name } = useDisplay();
	const large = computed(() => settingsStore.largeButtons && name.value === "sm");
	const btnSize = computed<"large" | undefined>(() => large.value ? "large" : undefined);
	const controlDensity = computed<"default" | "compact">(() => large.value ? "default" : "compact");
	return { large, btnSize, controlDensity };
}
