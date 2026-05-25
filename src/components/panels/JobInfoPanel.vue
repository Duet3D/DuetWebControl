<template>
	<PanelCard icon="mdi-information" :title="$t('panel.jobInfo.caption')">
		<v-card-text class="d-flex flex-column pt-0">
			<p v-if="hasLine('height')">
				<strong>{{ $t("panel.jobInfo.height") }}</strong>
				{{ height }}
			</p>
			<p v-if="hasLine('layerHeight') && isFFForUnset">
				<strong>{{ $t("panel.jobInfo.layerHeight") }}</strong>
				{{ layerHeight }}
			</p>
			<p v-if="hasLine('filament') && isFFForUnset">
				<strong>{{ $t("panel.jobInfo.filament") }}</strong>
				{{ displayZ(jobFile?.filament) }}
			</p>
			<p v-if="hasLine('generatedBy')">
				<strong>{{ $t("panel.jobInfo.generatedBy") }}</strong>
				{{ display(jobFile?.generatedBy) }}
			</p>
		</v-card-text>

		<template #settings>
			<v-switch v-for="option in lineOptions" :key="option.value"
					  :model-value="hasLine(option.value)" color="primary"
					  :label="option.title" v-hint="$t('panel.jobInfo.settings.displayedLinesHint')"
					  density="comfortable" hide-details
					  @update:model-value="toggleLine(option.value, $event === true)" />
		</template>
	</PanelCard>
</template>

<style scoped>
p {
	margin: 0;
	display: flex;
	align-items: baseline;
	gap: 0.35em;
}
</style>

<script setup lang="ts">
import { MachineMode } from "@duet3d/objectmodel";

import { useComponentSettings } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { display, displayZ } from "@/utils/display";

type JobInfoLine = "height" | "layerHeight" | "filament" | "generatedBy";

const ALL_JOB_INFO_LINES: ReadonlyArray<JobInfoLine> = ["height", "layerHeight", "filament", "generatedBy"];

const machineStore = useMachineStore();

const settings = useComponentSettings<{ displayedLines: Array<JobInfoLine> }>({
	displayedLines: [...ALL_JOB_INFO_LINES],
});

function hasLine(line: JobInfoLine): boolean {
	return settings.value.displayedLines.includes(line);
}

function toggleLine(line: JobInfoLine, visible: boolean) {
	const wanted = new Set(settings.value.displayedLines);
	if (visible) {
		wanted.add(line);
	} else {
		wanted.delete(line);
	}
	// Persist in canonical order so the rows always render top-to-bottom the same way
	settings.value.displayedLines = ALL_JOB_INFO_LINES.filter(candidate => wanted.has(candidate));
}

// Labels carry a trailing colon for inline display; strip it for the settings switches
const lineOptions = computed<Array<{ value: JobInfoLine; title: string }>>(() => [
	{ value: "height", title: i18n.global.t("panel.jobInfo.height").replace(/:$/, "") },
	{ value: "layerHeight", title: i18n.global.t("panel.jobInfo.layerHeight").replace(/:$/, "") },
	{ value: "filament", title: i18n.global.t("panel.jobInfo.filament").replace(/:$/, "") },
	{ value: "generatedBy", title: i18n.global.t("panel.jobInfo.generatedBy").replace(/:$/, "") }
]);

const jobFile = computed(() => machineStore.model.job.file);
const isFFForUnset = computed(() => !machineStore.model.state.machineMode
	|| machineStore.model.state.machineMode === MachineMode.fff);

// height and layerHeight default to 0 in the object model when no slicer info is parsed;
// treat that as "not available" rather than rendering a literal 0.00 mm
const height = computed(() => {
	const value = jobFile.value?.height ?? 0;
	return value > 0 ? displayZ(value) : displayZ(null);
});
const layerHeight = computed(() => {
	const value = jobFile.value?.layerHeight ?? 0;
	return value > 0 ? displayZ(value) : displayZ(null);
});
</script>
