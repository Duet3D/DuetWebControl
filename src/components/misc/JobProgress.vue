<template>
	<v-row dense>
		<v-col cols="12" class="d-flex">
			<span>{{ printStatus }}</span>
			<v-spacer />
			<span>{{ printDetails }}</span>
		</v-col>
		<v-col cols="12">
			<v-progress-linear :model-value="machineStore.jobProgress * 100" class="my-1" />
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { MachineMode, MachineStatus } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { display } from "@/utils/display";
import { isPrinting } from "@/utils/enums";
import { extractFileName } from "@/utils/path";

const machineStore = useMachineStore();

const status = computed(() => machineStore.model.state.status);

const printFile = computed(() => {
	const name = machineStore.model.job.file?.fileName;
	return name ? extractFileName(name) : null;
});

const lastPrintFile = computed(() => {
	const name = machineStore.model.job.lastFileName;
	return name !== null ? extractFileName(name) : null;
});

// True only while the current job is a simulation (M37 P"...") - latched on entry to simulating so that
// the "Simulated X" message still shows after the status flips out of simulating but before another job starts
const isSimulating = ref(false);
watch(status, (to) => {
	if (to === MachineStatus.simulating) {
		isSimulating.value = true;
	} else if (!isPrinting(to)) {
		isSimulating.value = false;
	}
}, { immediate: true });

const printStatus = computed(() => {
	if (isPrinting(status.value)) {
		if (printFile.value) {
			const progress = display(machineStore.jobProgress * 100, 1, "%");
			if (isSimulating.value) {
				return i18n.global.t("jobProgress.simulating", [printFile.value, progress]);
			}
			if (machineStore.model.state.machineMode === MachineMode.fff) {
				return i18n.global.t("jobProgress.printing", [printFile.value, progress]);
			}
			return i18n.global.t("jobProgress.processing", [printFile.value, progress]);
		}
		return i18n.global.t("generic.loading");
	}
	if (lastPrintFile.value) {
		if (machineStore.model.job.lastFileSimulated) {
			return i18n.global.t("jobProgress.simulated", [lastPrintFile.value]);
		}
		if (machineStore.model.state.machineMode === MachineMode.fff) {
			return i18n.global.t("jobProgress.printed", [lastPrintFile.value]);
		}
		return i18n.global.t("jobProgress.processed", [lastPrintFile.value]);
	}
	return i18n.global.t("jobProgress.noJob");
});

const printDetails = computed(() => {
	if (!isPrinting(status.value)) {
		return "";
	}

	let details = "";
	if (machineStore.model.job.layer !== null && machineStore.model.job.file?.numLayers) {
		details = i18n.global.t("jobProgress.layer", [machineStore.model.job.layer, machineStore.model.job.file.numLayers]);
	}
	if (machineStore.model.job.rawExtrusion !== null) {
		if (details !== "") {
			details += ", ";
		}
		details += i18n.global.t("jobProgress.filament", [display(machineStore.model.job.rawExtrusion, 1, "mm")]);
		if (machineStore.model.job.file !== null && machineStore.model.job.file.filament.length > 0) {
			const needed = machineStore.model.job.file.filament.reduce((a, b) => a + b);
			details += " (" + i18n.global.t("jobProgress.filamentRemaining", [
				display(Math.max(needed - machineStore.model.job.rawExtrusion, 0), 1, "mm")
			]) + ")";
		}
	}
	return details;
});
</script>
