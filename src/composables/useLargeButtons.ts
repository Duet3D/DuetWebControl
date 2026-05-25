import { computed } from "vue";
import { useDisplay } from "vuetify";

import { useSettingsStore } from "@/stores/settings";

// At the sm breakpoint with the largeButtons setting on, the app bar, page-level toolbars and
// the dashboard panels swap to finger-friendly sizing for small touchscreens. Consumers read
// `large` (boolean) for class/density tweaks and `btnSize` (Vuetify v-btn size token,
// undefined outside the active state) to drive button sizing without conditional templates
export function useLargeButtons() {
	const settingsStore = useSettingsStore();
	const { name } = useDisplay();
	const large = computed(() => settingsStore.largeButtons && name.value === "sm");
	const btnSize = computed<"large" | undefined>(() => large.value ? "large" : undefined);
	return { large, btnSize };
}
