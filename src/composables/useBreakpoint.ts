import { ref } from "vue";

// Module-scoped reactive flag tracking the md+ breakpoint. Backed by matchMedia so it updates
// without a Vue component instance - useful for places that evaluate outside setup(), e.g. the
// menu store's condition registry which decides menu visibility based on reactive state.
// 840px is Vuetify 4's MD3 md boundary; useDisplay() uses the same value
const MD_QUERY = typeof window !== "undefined" ? window.matchMedia("(min-width: 840px)") : null;
const isMdAndUpRef = ref(MD_QUERY?.matches ?? true);
MD_QUERY?.addEventListener("change", (e) => {
	isMdAndUpRef.value = e.matches;
});

export function isXsOrSm(): boolean {
	return !isMdAndUpRef.value;
}
