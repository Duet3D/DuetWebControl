<style scoped>
.filelist {
	overflow-y: auto;
	flex: 1 1 0;
	min-height: 0;
}

.analysis-chart-col {
	min-height: 260px;
}
@media (min-width: 840px) {
	.analysis-chart-col {
		min-height: 0;
	}
}

/* v-row wraps, so a flex line grows with its content; cap both columns at the row height where they sit side by side so their content scrolls instead */
@media (min-width: 840px) {
	.list-col,
	.result-col {
		max-height: 100%;
	}
}

.result-col {
	overflow-y: auto;
}
/* VAlert ships flex: 1 1 and would shrink to nothing next to the chart */
.result-col > *,
.result-col > .v-alert {
	flex: 0 0 auto;
}
.result-col > .result-chart {
	flex: 1 1 0;
	min-height: 260px;
}
.result-col > .summary-table {
	flex: 1 1 0;
	min-height: 120px;
	overflow: auto;
}
</style>

<template>
	<v-row class="content pa-2 ma-0 flex-grow-1">
		<v-col cols="12" md="6" lg="5" xl="4" class="d-flex pa-0 list-col">
			<v-card variant="flat" class="d-flex flex-column flex-grow-1">
				<v-card-title class="d-flex align-center pt-2 pb-1 flex-nowrap text-no-wrap">
					<v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
					{{ $t("plugins.accelerometer.motorProfiles") }}
					<v-spacer />
					<v-icon class="ml-2" :disabled="uiStore.uiFrozen" @click="emit('refresh')">mdi-refresh</v-icon>
				</v-card-title>

				<v-progress-linear :active="loading" indeterminate />

				<v-list v-if="!individualFiles" class="filelist py-0" density="compact" :disabled="uiStore.uiFrozen || loading">
					<v-list-item v-for="group in runs" :key="group.run" :active="selectedRun?.run === group.run"
								 :title="`#${group.run}`" :subtitle="getRunSubtitle(group)" lines="two" prepend-icon="mdi-run"
								 @click="selectedRun = group">
						<template #append>
							<v-icon @click.stop="deleteRun(group)">mdi-delete</v-icon>
						</template>
					</v-list-item>
				</v-list>

				<v-list v-else class="filelist py-0" density="compact" :disabled="uiStore.uiFrozen || loading">
					<v-list-group v-for="group in runs" :key="group.run">
						<template #activator="{ props: activatorProps }">
							<v-list-item v-bind="activatorProps" :title="`#${group.run}`" :subtitle="getRunSubtitle(group)" lines="two" prepend-icon="mdi-run" />
						</template>

						<v-list-item v-for="profile in group.profiles" :key="profile.filename" :active="selectedProfile?.filename === profile.filename"
									 :title="getProfileTitle(profile)" :subtitle="getProfileSubtitle(profile)" lines="two" prepend-icon="mdi-axis-arrow"
									 @click="selectedProfile = profile">
							<template #append>
								<v-icon @click.stop="deleteProfile(profile)">mdi-delete</v-icon>
							</template>
						</v-list-item>
					</v-list-group>
				</v-list>

				<v-checkbox v-model="individualFiles" :label="$t('plugins.accelerometer.individualFiles')" density="compact" color="primary" hide-details class="ma-3" />
			</v-card>
		</v-col>

		<v-col cols="12" md="6" lg="7" xl="8" class="d-flex flex-column pa-0 analysis-chart-col result-col">
			<!-- Run summary -->
			<template v-if="!individualFiles">
				<v-row v-if="selectedRun" class="ma-0 px-1 pt-2 flex-grow-0">
					<v-col cols="3" class="py-0 px-2">
						<v-btn-toggle v-model="summaryView" density="compact" variant="outlined" mandatory divided class="w-100">
							<v-btn value="chart" class="flex-grow-1">{{ $t("plugins.accelerometer.chartView") }}</v-btn>
							<v-btn value="table" class="flex-grow-1">{{ $t("plugins.accelerometer.tableView") }}</v-btn>
						</v-btn-toggle>
					</v-col>
					<v-col cols="3" class="py-0 px-2">
						<v-btn-toggle v-model="selectedMotor" density="compact" variant="outlined" mandatory divided class="w-100">
							<v-btn v-for="motor in runMotors" :key="motor" :value="motor" class="flex-grow-1">{{ $t("plugins.accelerometer.motor") }} {{ motor }}</v-btn>
						</v-btn-toggle>
					</v-col>
					<v-col cols="3" class="py-0 px-2">
						<v-btn-toggle v-model="showDisplacement" density="compact" variant="outlined" mandatory divided class="w-100">
							<v-btn :value="false" class="flex-grow-1">g</v-btn>
							<v-btn :value="true" class="flex-grow-1">um</v-btn>
						</v-btn-toggle>
					</v-col>
					<v-col cols="3" class="py-0 px-2">
						<v-select v-model="numHarmonics" :items="[2, 4, 8, 12, 16]" :label="$t('plugins.accelerometer.numHarmonics')" density="compact" variant="outlined" hide-details />
					</v-col>
				</v-row>
				<div v-if="!selectedRun" class="d-flex flex-grow-1 align-center justify-center">
					{{ $t("plugins.accelerometer.pickMotorRun") }}
				</div>
				<template v-else>
					<v-alert v-if="error" type="error" variant="tonal" class="mb-0 flex-grow-0">
						{{ error }}
					</v-alert>

					<div v-if="displayedSummary" class="text-body-2 px-2 pt-2">
						{{ $t("plugins.accelerometer.motorSummaryInfo", [selectedRun.run, selectedMotor, motorProfiles.length]) }}
					</div>

					<div v-if="summaryView === 'chart'" class="result-chart pa-2">
						<MotorAnalysisChart :axes="[]" :harmonics="null" :spectrum="null" :sweep="null" :summary="displayedSummary" view="summary"
											:y-axis-title="showDisplacement ? $t('plugins.accelerometer.yAxisDisplacement') : $t('plugins.accelerometer.yAxisAcceleration')" />
					</div>

					<div v-if="summaryView === 'table' && displayedSummary" class="summary-table flex-grow-1">
						<v-table density="compact">
							<thead>
								<tr>
									<th>{{ $t("plugins.accelerometer.harmonic") }}</th>
									<th v-for="(frequency, index) in displayedSummary.frequencies" :key="index" class="text-no-wrap">{{ Math.round(frequency) }} Hz</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(order, orderIndex) in displayedSummary.orders" :key="order">
									<td class="text-no-wrap">{{ order }}x</td>
									<td v-for="(amplitude, index) in displayedSummary.amplitudes[orderIndex]" :key="index" class="text-no-wrap">
										<template v-if="amplitude !== null">
											{{ showDisplacement ? amplitude.toFixed(2) : amplitude.toFixed(4) }}
											<span v-if="order !== 1 && displayedSummary.ratios[orderIndex][index] !== null" class="text-medium-emphasis">({{ Math.round(displayedSummary.ratios[orderIndex][index]! * 100) }}%)</span>
										</template>
									</td>
								</tr>
							</tbody>
						</v-table>
					</div>

					<v-alert v-for="(finding, index) in findings" :key="index" :type="finding.type" variant="tonal" density="compact" class="mt-2 mb-0 flex-grow-0">
						{{ finding.text }}
					</v-alert>
				</template>
			</template>

			<!-- Individual files -->
			<template v-else>
				<v-row v-if="selectedProfile" class="ma-0 px-1 pt-2 flex-grow-0">
					<v-col cols="4" class="py-0 px-2">
						<v-btn-toggle v-model="view" density="compact" variant="outlined" mandatory divided class="w-100">
							<v-btn value="harmonics" class="flex-grow-1">{{ $t("plugins.accelerometer.harmonicsView") }}</v-btn>
							<v-btn value="spectrum" class="flex-grow-1">{{ $t("plugins.accelerometer.spectrumView") }}</v-btn>
							<v-btn value="sweep" class="flex-grow-1" :disabled="sweepProfiles.length < 2">{{ $t("plugins.accelerometer.sweepView") }}</v-btn>
						</v-btn-toggle>
					</v-col>
					<v-col cols="4" class="py-0 px-2">
						<v-btn-toggle v-model="showDisplacement" density="compact" variant="outlined" mandatory divided class="w-100">
							<v-btn :value="false" class="flex-grow-1">g</v-btn>
							<v-btn :value="true" class="flex-grow-1">um</v-btn>
						</v-btn-toggle>
					</v-col>
					<v-col cols="4" class="py-0 px-2">
						<v-select v-model="numHarmonics" :items="[2, 4, 8, 12, 16]" :label="$t('plugins.accelerometer.numHarmonics')" density="compact" variant="outlined" hide-details />
					</v-col>
				</v-row>
				<div v-if="!selectedProfile" class="d-flex flex-grow-1 align-center justify-center">
					{{ $t("plugins.accelerometer.pickMotorProfile") }}
				</div>
				<template v-else>
					<v-alert v-if="error" type="error" variant="tonal" class="mb-0 flex-grow-0">
						{{ error }}
					</v-alert>
					<v-alert v-if="dataset && dataset.overflows > 0" type="warning" variant="tonal" class="mb-0 flex-grow-0">
						{{ $t("plugins.accelerometer.overflowWarning") }}
					</v-alert>

					<div v-if="view === 'sweep' && sweep" class="text-body-2 px-2 pt-2">
						{{ $t("plugins.accelerometer.motorSweepInfo", [selectedProfile.run, selectedProfile.motor, sweep.feedrates.length]) }}
					</div>
					<div v-else-if="analysis" class="text-body-2 px-2 pt-2">
						{{ $t("plugins.accelerometer.motorAnalysisInfo", [nominalFrequency.toFixed(1), analysis.harmonics.fundamental.toFixed(2), analysis.start, analysis.end, dataset!.samplingRate]) }}
					</div>

					<div class="result-chart pa-2">
						<MotorAnalysisChart :axes="dataset?.axes ?? []" :harmonics="displayedHarmonics" :spectrum="displayedSpectrum" :sweep="sweep" :summary="null" :view="view"
											:y-axis-title="showDisplacement ? $t('plugins.accelerometer.yAxisDisplacement') : $t('plugins.accelerometer.yAxisAcceleration')" />
					</div>

					<v-table v-if="view !== 'sweep' && displayedHarmonics" density="compact" class="flex-grow-0">
						<thead>
							<tr>
								<th>{{ $t("plugins.accelerometer.harmonic") }}</th>
								<th>{{ $t("plugins.accelerometer.frequency") }}</th>
								<th v-for="axis in dataset!.axes" :key="axis">{{ axis }} ({{ showDisplacement ? "um" : "g" }})</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(frequency, index) in displayedHarmonics.frequencies" :key="index">
								<td>{{ displayedHarmonics.orders[index] }}x</td>
								<td>{{ frequency.toFixed(1) }} Hz</td>
								<td v-for="(amplitudes, axis) in displayedHarmonics.amplitudes" :key="axis">
									{{ showDisplacement ? amplitudes[index].toFixed(2) : amplitudes[index].toFixed(4) }}
								</td>
							</tr>
						</tbody>
					</v-table>
				</template>
			</template>
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { type AccelerometerDataset, analyzeAccelerometerData, analyzeMotorHarmonics, type FrequencyAnalysisResult, getDisplacementAmplitude, getFullStepFrequency, type MotorHarmonicsResult, type MotorSweepSummary, summarizeMotorSweep } from "@duet3d/motionanalysis";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import { getErrorMessage } from "@/utils/errors";
import Path from "@/utils/path";

import MotorAnalysisChart from "./MotorAnalysisChart.vue";
import { getConstantSpeedWindow, getMotorFeedrate, type MotorProfile, type MotorSweepResult, type MotorView, parseMotorProfileFilename } from "./motorProfiles";
import { useAccelerometer } from "./useAccelerometer";

// Standard gravity in mm/s^2 for converting g into displacement
const gravity = 9806.65;

interface ProfileAnalysis {
	harmonics: MotorHarmonicsResult;
	start: number;
	end: number;
}

interface RunGroup {
	run: number;
	profiles: Array<MotorProfile>;
	lastModified: Date | null;
}

interface Finding {
	type: "info" | "success" | "warning";
	text: string;
}

const props = defineProps<{
	files: Array<string>;
	filesLastModified: Array<Date>;
}>();

const emit = defineEmits<{
	refresh: [];
}>();

const machineStore = useMachineStore();
const uiStore = useUiStore();
const { loadAccelerometerFile } = useAccelerometer();

// #region Profiles and runs
const profiles = computed<Array<MotorProfile>>(() => props.files.map(parseMotorProfileFilename).filter((profile): profile is MotorProfile => profile !== null));

// Profiles grouped by run, newest run first
const runs = computed<Array<RunGroup>>(() => {
	const groups = new Map<number, RunGroup>();
	for (const profile of profiles.value) {
		let group = groups.get(profile.run);
		if (!group) {
			group = { run: profile.run, profiles: [], lastModified: null };
			groups.set(profile.run, group);
		}
		group.profiles.push(profile);
		const index = props.files.indexOf(profile.filename);
		if (index >= 0 && (!group.lastModified || props.filesLastModified[index] > group.lastModified)) {
			group.lastModified = props.filesLastModified[index];
		}
	}
	for (const group of groups.values()) {
		group.profiles.sort((a, b) => (a.motor.localeCompare(b.motor)) || (a.feedrate - b.feedrate));
	}
	return Array.from(groups.values()).sort((a, b) => b.run - a.run);
});

const individualFiles = ref(false);
const selectedRun = ref<RunGroup | null>(null);
const selectedProfile = ref<MotorProfile | null>(null);
const selectedMotor = ref<string | null>(null);
const summaryView = ref<"chart" | "table">("chart");
const loading = ref(false);
const error = ref<string | null>(null);
const datasets = ref(new Map<string, AccelerometerDataset>());
const view = ref<MotorView>("harmonics");
const showDisplacement = ref(false);
const numHarmonics = ref(4);

function getNominalFrequency(profile: MotorProfile): number {
	return getFullStepFrequency(getMotorFeedrate(profile), profile.fullStepsPerMm, 1);
}

function getRunSubtitle(group: RunGroup): string {
	const motors = Array.from(new Set(group.profiles.map((profile) => profile.motor))).join(", ");
	return `${i18n.global.t("plugins.accelerometer.numRecordings", [group.profiles.length])}, ${i18n.global.t("plugins.accelerometer.motor")} ${motors}, ${group.lastModified?.toLocaleString() ?? ""}`;
}

function getProfileTitle(profile: MotorProfile): string {
	return `${i18n.global.t("plugins.accelerometer.motor")} ${profile.motor}, ${getNominalFrequency(profile).toFixed(1)} Hz`;
}

function getProfileSubtitle(profile: MotorProfile): string {
	return `${(profile.feedrate / 60).toFixed(1)} mm/s, ${profile.distance} mm, ${profile.fullStepsPerMm} ${i18n.global.t("plugins.accelerometer.fullStepsPerMm")}`;
}
// #endregion

// #region Analysis
// Sample range covering the constant-speed part of the move, trimmed by 10% on each side to stay clear of the ramps
function analyzeProfile(profile: MotorProfile, data: AccelerometerDataset): ProfileAnalysis | null {
	const window = getConstantSpeedWindow(profile), rate = data.samplingRate;
	if (window.duration <= 0) {
		return null;
	}
	const start = Math.min(data.samples[0].length - 1, Math.round((window.start + 0.1 * window.duration) * rate));
	const end = Math.min(data.samples[0].length, Math.round((window.start + 0.9 * window.duration) * rate));
	const samples = data.samples.map((axisSamples) => axisSamples.slice(start, end));
	return {
		harmonics: analyzeMotorHarmonics(samples, rate, getNominalFrequency(profile), numHarmonics.value),
		start,
		end
	};
}

// Convert g into um of displacement per frequency when requested
function toDisplayedAmplitude(amplitude: number, frequency: number): number {
	return showDisplacement.value ? getDisplacementAmplitude(amplitude * gravity, frequency) * 1000 : amplitude;
}

function toDisplayedAmplitudes(frequencies: number[], amplitudes: number[][]): number[][] {
	return amplitudes.map((axisAmplitudes) => axisAmplitudes.map((amplitude, index) => toDisplayedAmplitude(amplitude, frequencies[index])));
}
// #endregion

// #region Run summary
const runMotors = computed(() => selectedRun.value ? Array.from(new Set(selectedRun.value.profiles.map((profile) => profile.motor))) : []);
const motorProfiles = computed(() => selectedRun.value ? selectedRun.value.profiles.filter((profile) => profile.motor === selectedMotor.value) : []);

const summary = computed<MotorSweepSummary | null>(() => {
	if (individualFiles.value || motorProfiles.value.length === 0 || motorProfiles.value.some((profile) => !datasets.value.has(profile.filename))) {
		return null;
	}
	const results: Array<MotorHarmonicsResult> = [];
	for (const profile of motorProfiles.value) {
		try {
			const result = analyzeProfile(profile, datasets.value.get(profile.filename)!);
			if (result) {
				results.push(result.harmonics);
			}
		} catch {
			// Profiles above the Nyquist frequency are skipped
		}
	}
	return (results.length > 0) ? summarizeMotorSweep(results) : null;
});

const displayedSummary = computed<MotorSweepSummary | null>(() => summary.value ? { ...summary.value, amplitudes: summary.value.amplitudes.map((row) => row.map((amplitude, index) => (amplitude !== null) ? toDisplayedAmplitude(amplitude, summary.value!.frequencies[index]) : null)) } : null);

// Mean ratio of an order to the full-step amplitude over all absolute frequencies where both exist
function getMeanRatio(order: number): number | null {
	if (!summary.value) {
		return null;
	}
	const ratios = (summary.value.ratios[summary.value.orders.indexOf(order)] ?? []).filter((ratio): ratio is number => ratio !== null);
	return (ratios.length > 0) ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length : null;
}

function getLevel(ratio: number): "low" | "moderate" | "high" {
	return (ratio < 0.1) ? "low" : (ratio < 0.3) ? "moderate" : "high";
}

// Plain-language reading of the sub-orders: 0.5x = coil imbalance, 0.25x/0.75x = current waveform shape, 2x = step ripple harmonics
const findings = computed<Array<Finding>>(() => {
	const result: Array<Finding> = [];
	if (!summary.value || !selectedMotor.value) {
		return result;
	}
	const phase = getMeanRatio(0.5);
	if (phase !== null) {
		const level = getLevel(phase);
		result.push({ type: (level === "high") ? "warning" : "info", text: i18n.global.t("plugins.accelerometer.findingPhase", [selectedMotor.value, Math.round(phase * 100), i18n.global.t(`plugins.accelerometer.level.${level}`)]) });
	}
	const waveform = [getMeanRatio(0.25), getMeanRatio(0.75)].filter((ratio): ratio is number => ratio !== null);
	if (waveform.length > 0) {
		const ratio = Math.max(...waveform), level = getLevel(ratio);
		result.push({ type: (level === "high") ? "warning" : "info", text: i18n.global.t("plugins.accelerometer.findingWaveform", [selectedMotor.value, Math.round(ratio * 100), i18n.global.t(`plugins.accelerometer.level.${level}`)]) });
	}
	const second = getMeanRatio(2);
	if (second !== null) {
		result.push({ type: "info", text: i18n.global.t("plugins.accelerometer.findingHarmonics", [selectedMotor.value, Math.round(second * 100)]) });
	}
	return result;
});
// #endregion

// #region Individual files
const dataset = computed(() => selectedProfile.value ? datasets.value.get(selectedProfile.value.filename) ?? null : null);
const nominalFrequency = computed(() => selectedProfile.value ? getNominalFrequency(selectedProfile.value) : 0);

// Profiles of the same run, motor and accelerometer at different feedrates, sorted by feedrate
const sweepProfiles = computed<Array<MotorProfile>>(() => {
	const selected = selectedProfile.value;
	if (!selected) {
		return [];
	}
	return profiles.value
		.filter((profile) => profile.run === selected.run && profile.motor === selected.motor && profile.accelerometer === selected.accelerometer && profile.distance === selected.distance)
		.sort((a, b) => a.feedrate - b.feedrate);
});

const analysis = computed<ProfileAnalysis | null>(() => {
	if (!selectedProfile.value || !dataset.value) {
		return null;
	}
	try {
		return analyzeProfile(selectedProfile.value, dataset.value);
	} catch (e) {
		error.value = getErrorMessage(e);
		return null;
	}
});

const spectrum = computed<FrequencyAnalysisResult | null>(() => {
	if (view.value !== "spectrum" || !analysis.value) {
		return null;
	}
	return analyzeAccelerometerData(dataset.value!.samples.map((axisSamples) => axisSamples.slice(analysis.value!.start, analysis.value!.end)), dataset.value!.samplingRate, true, true);
});

// Sub-orders below the fundamental plus the integer orders, combined over all accelerometer axes per profile
const sweep = computed<MotorSweepResult | null>(() => {
	if (view.value !== "sweep" || sweepProfiles.value.length < 2 || sweepProfiles.value.some((profile) => !datasets.value.has(profile.filename))) {
		return null;
	}
	const results = sweepProfiles.value.map((profile) => {
		try {
			return analyzeProfile(profile, datasets.value.get(profile.filename)!);
		} catch {
			return null;
		}
	});
	const orders = Array.from(new Set(results.flatMap((result) => result ? result.harmonics.orders : []))).filter((order) => order < 1 || Number.isInteger(order)).sort((a, b) => a - b);
	return {
		feedrates: sweepProfiles.value.map((profile) => profile.feedrate),
		fullStepFrequencies: sweepProfiles.value.map(getNominalFrequency),
		orders,
		amplitudes: orders.map((order) => results.map((result) => {
			const index = result ? result.harmonics.orders.indexOf(order) : -1;
			if (index < 0) {
				return NaN;
			}
			const amplitude = Math.sqrt(result!.harmonics.amplitudes.reduce((sum, axisAmplitudes) => sum + axisAmplitudes[index] * axisAmplitudes[index], 0));
			return toDisplayedAmplitude(amplitude, result!.harmonics.frequencies[index]);
		}))
	};
});

const displayedHarmonics = computed<MotorHarmonicsResult | null>(() => analysis.value ? { ...analysis.value.harmonics, amplitudes: toDisplayedAmplitudes(analysis.value.harmonics.frequencies, analysis.value.harmonics.amplitudes) } : null);
const displayedSpectrum = computed<FrequencyAnalysisResult | null>(() => spectrum.value ? { ...spectrum.value, amplitudes: toDisplayedAmplitudes(spectrum.value.frequencies, spectrum.value.amplitudes) } : null);
// #endregion

// #region File handling
async function deleteProfile(profile: MotorProfile) {
	if (selectedProfile.value?.filename === profile.filename) {
		selectedProfile.value = null;
	}
	datasets.value.delete(profile.filename);
	await machineStore.delete(Path.combine(Path.accelerometer, profile.filename));
	emit("refresh");
}

async function deleteRun(group: RunGroup) {
	if (selectedRun.value?.run === group.run) {
		selectedRun.value = null;
	}
	for (const profile of group.profiles) {
		datasets.value.delete(profile.filename);
		await machineStore.delete(Path.combine(Path.accelerometer, profile.filename));
	}
	emit("refresh");
}

async function loadProfiles(toLoad: Array<MotorProfile>) {
	error.value = null;
	loading.value = true;
	try {
		for (const profile of toLoad) {
			if (!datasets.value.has(profile.filename)) {
				const loaded = await loadAccelerometerFile(profile.filename);
				datasets.value.set(profile.filename, loaded);
			}
		}
		if (selectedProfile.value && individualFiles.value && getConstantSpeedWindow(selectedProfile.value).duration <= 0) {
			error.value = i18n.global.t("plugins.accelerometer.noConstantSpeed");
		}
	} catch (e) {
		error.value = getErrorMessage(e);
	} finally {
		loading.value = false;
	}
}

watch(selectedRun, async (to) => {
	if (to) {
		if (!selectedMotor.value || !runMotors.value.includes(selectedMotor.value)) {
			selectedMotor.value = runMotors.value[0] ?? null;
		}
		await loadProfiles(to.profiles);
	}
});

watch(selectedProfile, async (to) => {
	if (to) {
		await loadProfiles(view.value === "sweep" ? sweepProfiles.value : [to]);
	}
});

watch(view, async (to) => {
	if (to === "sweep") {
		await loadProfiles(sweepProfiles.value);
	}
});

watch(individualFiles, () => {
	error.value = null;
});

watch(runs, (to) => {
	if (selectedRun.value) {
		selectedRun.value = to.find((group) => group.run === selectedRun.value!.run) ?? null;
	}
});

watch(profiles, (to) => {
	if (selectedProfile.value && !to.some((profile) => profile.filename === selectedProfile.value!.filename)) {
		selectedProfile.value = null;
	}
	for (const filename of datasets.value.keys()) {
		if (!to.some((profile) => profile.filename === filename)) {
			datasets.value.delete(filename);
		}
	}
});

watch(sweepProfiles, (to) => {
	if (view.value === "sweep" && to.length < 2) {
		view.value = "harmonics";
	}
});
// #endregion
</script>
