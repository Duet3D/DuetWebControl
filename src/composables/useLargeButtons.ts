import { computed } from "vue";
import { useDisplay } from "vuetify";

import { useSettingsStore } from "@/stores/settings";

// At the sm breakpoint with the largeButtons setting on, App.vue puts the dwc-large-buttons class
// on <html> and styles/large-buttons.css enlarges buttons, list items, inputs, tabs and tables
// everywhere. Consumers read `large` (boolean) for tweaks the stylesheet cannot reach, and
// `controlDensity` for v-toolbar, whose height Vuetify computes from the density prop inline
export function useLargeButtons() {
	const settingsStore = useSettingsStore();
	const { name } = useDisplay();
	const large = computed(() => settingsStore.largeButtons && (name.value === "sm"));
	const controlDensity = computed<"default" | "compact">(() => large.value ? "default" : "compact");
	return { large, controlDensity };
}
