import { computed, type WritableComputedRef } from "vue";

import { useComponentSettings } from "@/composables/useComponentSettings";

interface MotorAnalysisSettings {
	showDisplacement: boolean;
	numHarmonics: number;
}

/**
 * Persisted display settings shared by the Motor Analysis tab and the tuning dialog
 */
export function useMotorAnalysisSettings(): { showDisplacement: WritableComputedRef<boolean>; numHarmonics: WritableComputedRef<number> } {
	const settings = useComponentSettings<MotorAnalysisSettings>({ showDisplacement: false, numHarmonics: 4 }, { id: "plugins/inputShaping/motorAnalysis" });
	return {
		showDisplacement: computed({ get: () => settings.value.showDisplacement, set: (value) => { settings.value.showDisplacement = value; } }),
		numHarmonics: computed({ get: () => settings.value.numHarmonics, set: (value) => { settings.value.numHarmonics = value; } })
	};
}
