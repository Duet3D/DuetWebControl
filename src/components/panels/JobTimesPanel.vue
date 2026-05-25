<template>
	<PanelCard icon="mdi-clock" :title="$t('panel.jobTimes.caption')">
		<!-- A lone estimate column leaves the panel short; drop the body top padding to close the gap to the title -->
		<v-card-text class="text-center pb-2" :class="{ 'pt-0': topRowColumnCount === 1 }">
			<v-row v-if="topRowColumnCount > 0" density="compact">
				<v-col v-if="hasEstimation('filament') && timesLeft.filament !== null" class="d-flex flex-column">
					<strong>{{ $t("panel.jobTimes.filament") }}</strong>
					<span>{{ displayTime(timesLeft.filament) }}</span>
				</v-col>
				<v-col v-if="hasEstimation('file')" class="d-flex flex-column">
					<strong>{{ $t("panel.jobTimes.file") }}</strong>
					<span>{{ displayTime(timesLeft.file) }}</span>
				</v-col>
				<v-col v-if="hasEstimation('slicer') && slicerTimeLeft !== null" class="d-flex flex-column">
					<strong>{{ $t("panel.jobTimes.slicer") }}</strong>
					<span>{{ displayTime(slicerTimeLeft) }}</span>
				</v-col>
				<v-col v-if="hasEstimation('toPause') && timesLeft.toPause !== null" class="d-flex flex-column">
					<strong>{{ $t("panel.jobTimes.toPause") }}</strong>
					<span>{{ displayTime(timesLeft.toPause) }}</span>
				</v-col>
				<v-col v-if="hasEstimation('simulation') && simulationTime !== null" class="d-flex flex-column">
					<strong>{{ $t("panel.jobTimes.simulation") }}</strong>
					<span>{{ displayTime(simulationTime) }}</span>
				</v-col>
				<!-- Non-FFF jobs have no layers, so the job duration moves up next to the estimates -->
				<v-col v-if="jobDurationInTopRow" class="d-flex flex-column">
					<strong>{{ $t("panel.jobTimes.jobDuration") }}</strong>
					<span>{{ displayTime(jobDuration) }}</span>
				</v-col>
			</v-row>

			<v-divider v-if="uiStore.isFFF && anyEstimationVisible && anyDataVisible" class="my-3" />

			<v-row v-if="dataRowVisible" density="compact">
				<v-col v-if="uiStore.isFFF && hasData('warmUpDuration')" class="d-flex flex-column">
					<strong>{{ $t("panel.jobTimes.warmUpDuration") }}</strong>
					<span>{{ displayTime(warmUpDuration) }}</span>
				</v-col>
				<v-col v-if="uiStore.isFFF && hasData('currentLayerTime')" class="d-flex flex-column">
					<strong>{{ $t("panel.jobTimes.currentLayerTime") }}</strong>
					<span>{{ displayTime(layerTime) }}</span>
				</v-col>
				<v-col v-if="uiStore.isFFF && hasData('lastLayerTime')" class="d-flex flex-column">
					<strong>{{ $t("panel.jobTimes.lastLayerTime") }}</strong>
					<span>{{ displayTime(lastLayerTime) }}</span>
				</v-col>
				<v-col v-if="uiStore.isFFF && hasData('jobDuration')" class="d-flex flex-column">
					<strong>{{ $t("panel.jobTimes.jobDuration") }}</strong>
					<span>{{ displayTime(jobDuration) }}</span>
				</v-col>
			</v-row>
		</v-card-text>

		<template #settings>
			<v-switch v-for="option in estimationOptions" :key="option.value"
					  :model-value="hasEstimation(option.value)" color="primary"
					  :label="option.title" v-hint="$t('panel.jobTimes.settings.displayedEstimationsHint')"
					  density="comfortable" hide-details
					  @update:model-value="toggleEstimation(option.value, $event === true)" />

			<v-divider class="my-3" />

			<template v-for="option in dataOptions" :key="option.value">
				<v-switch v-if="!option.fffOnly || uiStore.isFFF"
						  :model-value="hasData(option.value)" color="primary"
						  v-hint="$t('panel.jobTimes.settings.displayedDataHint')"
						  density="comfortable" hide-details
						  @update:model-value="toggleData(option.value, $event === true)">
					<template #label>
						{{ option.title }}
						<v-chip v-if="option.fffOnly" size="x-small" label class="ms-2">FFF</v-chip>
					</template>
				</v-switch>
			</template>
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import { MachineStatus, TimesLeft } from "@duet3d/objectmodel";

import { useComponentSettings } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import { displayTime } from "@/utils/display";
import { isPrinting as isPrintingEnum } from "@/utils/enums";

type EstimationLine = "filament" | "file" | "slicer" | "toPause" | "simulation";
type DataLine = "warmUpDuration" | "currentLayerTime" | "lastLayerTime" | "jobDuration";

const ALL_ESTIMATION_LINES: ReadonlyArray<EstimationLine> = ["filament", "file", "slicer", "toPause", "simulation"];
const ALL_DATA_LINES: ReadonlyArray<DataLine> = ["warmUpDuration", "currentLayerTime", "lastLayerTime", "jobDuration"];

const machineStore = useMachineStore();
const uiStore = useUiStore();

const isPrinting = computed(() => isPrintingEnum(machineStore.model.state.status));

// #region Settings
interface JobTimesSettings {
	estimationLines: Array<EstimationLine>;
	dataLines: Array<DataLine>;
}

const settings = useComponentSettings<JobTimesSettings>({
	estimationLines: [...ALL_ESTIMATION_LINES],
	dataLines: [...ALL_DATA_LINES],
});

function hasEstimation(line: EstimationLine): boolean {
	return settings.value.estimationLines.includes(line);
}

function hasData(line: DataLine): boolean {
	return settings.value.dataLines.includes(line);
}

function toggleEstimation(line: EstimationLine, visible: boolean) {
	const wanted = new Set(settings.value.estimationLines);
	if (visible) {
		wanted.add(line);
	} else {
		wanted.delete(line);
	}
	// Persist in canonical order so the columns always render left-to-right the same way
	settings.value.estimationLines = ALL_ESTIMATION_LINES.filter(candidate => wanted.has(candidate));
}

function toggleData(line: DataLine, visible: boolean) {
	const wanted = new Set(settings.value.dataLines);
	if (visible) {
		wanted.add(line);
	} else {
		wanted.delete(line);
	}
	// Persist in canonical order so the columns always render left-to-right the same way
	settings.value.dataLines = ALL_DATA_LINES.filter(candidate => wanted.has(candidate));
}

const estimationOptions = computed<Array<{ value: EstimationLine; title: string }>>(() => [
	{ value: "filament", title: i18n.global.t("panel.jobTimes.filament") },
	{ value: "file", title: i18n.global.t("panel.jobTimes.file") },
	{ value: "slicer", title: i18n.global.t("panel.jobTimes.slicer") },
	{ value: "toPause", title: i18n.global.t("panel.jobTimes.toPause") },
	{ value: "simulation", title: i18n.global.t("panel.jobTimes.simulation") }
]);

// `fffOnly` flags the options that only apply in FFF mode - hidden in other modes, and tagged
// with an "FFF" chip while shown. Warm-up and layer times have no meaning for CNC/laser jobs
const dataOptions = computed<Array<{ value: DataLine; title: string; fffOnly: boolean }>>(() => [
	{ value: "warmUpDuration", title: i18n.global.t("panel.jobTimes.warmUpDuration"), fffOnly: true },
	{ value: "currentLayerTime", title: i18n.global.t("panel.jobTimes.currentLayerTime"), fffOnly: true },
	{ value: "lastLayerTime", title: i18n.global.t("panel.jobTimes.lastLayerTime"), fffOnly: true },
	{ value: "jobDuration", title: i18n.global.t("panel.jobTimes.jobDuration"), fffOnly: false }
]);
// #endregion

// #region Estimated
const isSimulating = ref(false);
const timesLeft = computed<TimesLeft>(() => machineStore.model.job.timesLeft);

const slicerTimeLeft = computed(() => {
	const job = machineStore.model.job;
	if (job.timesLeft.slicer !== null) {
		return job.timesLeft.slicer;
	}
	if (job.file !== null && job.duration !== null && job.file.printTime !== null) {
		return isPrinting.value
			? Math.max(0, (job.file.printTime as number) - job.duration)
			: job.file.printTime as number;
	}
	return null;
});

const simulationTime = computed(() => {
	const job = machineStore.model.job;
	if (!isSimulating.value && job.file !== null && job.file.simulatedTime !== null && job.duration !== null) {
		return isPrinting.value
			? Math.max(0, (job.file.simulatedTime as number) - job.duration)
			: job.file.simulatedTime as number;
	}
	return null;
});

// Each entry mirrors the v-if of its column in the estimated row
const estimationColumnCount = computed(() => [
	hasEstimation("filament") && timesLeft.value.filament !== null,
	hasEstimation("file"),
	hasEstimation("slicer") && slicerTimeLeft.value !== null,
	hasEstimation("toPause") && timesLeft.value.toPause !== null,
	hasEstimation("simulation") && simulationTime.value !== null,
].filter(Boolean).length);

const anyEstimationVisible = computed(() => estimationColumnCount.value > 0);

// Non-FFF jobs have no layers, so the job duration is shown in the top row instead of a
// separate measured row
const jobDurationInTopRow = computed(() => !uiStore.isFFF && hasData("jobDuration"));
const topRowColumnCount = computed(() => estimationColumnCount.value + (jobDurationInTopRow.value ? 1 : 0));

onMounted(() => {
	isSimulating.value = machineStore.model.state.status === MachineStatus.simulating;
});

watch(isPrinting, (to) => {
	if (to) {
		isSimulating.value = machineStore.model.state.status === MachineStatus.simulating;
	} else {
		isSimulating.value = false;
	}
});
// #endregion

// #region Measured
const warmUpDuration = computed(() => isPrinting.value
	? machineStore.model.job.warmUpDuration
	: machineStore.model.job.lastWarmUpDuration);

const layerTime = computed(() => machineStore.model.job.layerTime);

const lastLayerTime = computed(() => {
	const layers = machineStore.model.job.layers;
	return layers.length > 0 ? layers[layers.length - 1].duration : null;
});

const jobDuration = computed(() => isPrinting.value
	? machineStore.model.job.duration
	: machineStore.model.job.lastDuration);

const anyDataVisible = computed(() => settings.value.dataLines.length > 0);

// The measured row is FFF-only: warm-up and layer times have no meaning for CNC/laser jobs,
// and the job duration moves up into the top row there
const dataRowVisible = computed(() => uiStore.isFFF && anyDataVisible.value);
// #endregion
</script>
