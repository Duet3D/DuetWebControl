<!-- Input Shaping plugin shell. Two tabs ("Current Settings" shows live damping curves; "Motion
	 Analysis" lets the user pick a recorded profile and inspect/estimate the shaper effect)
	 share the same chart component plus a sidebar listing each shaper kind with apply/configured
	 chips. A "Record Motion Profile" button opens a wizard that captures fresh CSV samples on
	 the machine. CSV files live under /sys/accelerometer and are filtered out of the regular
	 Files view -->
<template>
	<v-row class="ma-0">
		<v-col>
			<v-card>
				<v-tabs v-model="tab" density="compact">
					<v-tab value="current">
						<v-icon class="mr-1">mdi-information</v-icon>
						{{ $t("plugins.accelerometer.currentSettings") }}
					</v-tab>
					<v-tab value="analysis">
						<v-icon class="mr-1">mdi-file</v-icon>
						{{ $t("plugins.accelerometer.motionAnalysis") }}
					</v-tab>

					<v-btn color="success" class="align-self-center ml-auto mr-2 d-none d-md-inline-flex"
						   :disabled="uiStore.uiFrozen" @click="showDataCollection = true">
						<v-icon class="mr-1">mdi-record</v-icon>
						{{ $t("plugins.accelerometer.recordButton") }}
					</v-btn>
				</v-tabs>

				<v-window v-model="tab" :touch="false">
					<v-window-item value="current">
						<div class="d-flex flex-column">
							<v-alert v-if="!isInputShapingEnabled" type="info" class="mb-0" variant="tonal"
									 :title="$t('plugins.accelerometer.notConfigured')" />
							<div v-show="isInputShapingEnabled" class="content flex-grow-1 pa-2">
								<InputShapingChart :frequencies="currentFrequencies" :ringing-frequency="frequency"
												   :input-shapers="inputShapers" :input-shaper-frequency="frequency"
												   :input-shaper-damping="damping" :wide-band="false" />
							</div>
						</div>
					</v-window-item>

					<v-window-item value="analysis">
						<div class="d-flex flex-column">
							<v-progress-linear :active="loadingFiles" indeterminate />
							<v-alert v-if="files.length === 0 && !filesError" type="info" class="mb-0"
									 variant="tonal">
								{{ $t("plugins.accelerometer.noMotionProfiles") }}
								<a href="javascript:void(0)" class="text-decoration-underline" @click="refresh">
									{{ $t("plugins.accelerometer.refreshLink") }}
								</a>
							</v-alert>
							<v-alert v-if="filesError" type="error" class="mb-0" variant="tonal">
								{{ filesError }}
							</v-alert>
							<v-row v-if="files.length > 0" class="content pa-2 ma-0">
								<v-col cols="auto" class="d-flex pa-0">
									<InputShapingFileList :title="$t('plugins.accelerometer.motionProfiles')"
														  can-delete :files="files"
														  :files-last-modified="filesLastModified"
														  v-model:selectedFiles="filesToAnalyze"
														  v-model:frequencies="fileFrequenciesToAnalyze"
														  v-model="fileDataToAnalyze"
														  v-model:sampleStartIndex="sampleStartIndex"
														  v-model:sampleEndIndex="sampleEndIndex"
														  v-model:hadOverflow="hadOverflow"
														  v-model:estimateShaperEffect="estimateShaperEffect"
														  v-model:showOriginalValues="showOriginalValues"
														  v-model:wideBand="wideBand"
														  @refresh="refresh" />
								</v-col>
								<v-col v-if="filesToAnalyze.length === 0"
									   class="d-flex align-center justify-center">
									{{ $t("plugins.accelerometer.pickProfile") }}
								</v-col>
								<v-col v-else class="d-flex flex-column pa-0">
									<v-alert v-if="hadOverflow" type="warning" variant="tonal" class="mb-0">
										{{ $t("plugins.accelerometer.overflowWarning") }}
									</v-alert>
									<v-card variant="outlined" class="d-block fill-height pa-2">
										<InputShapingChart can-show-samples
														   v-model:sampleStartIndex="sampleStartIndex"
														   v-model:sampleEndIndex="sampleEndIndex"
														   :frequencies="fileFrequenciesToAnalyze ?? undefined"
														   :value="fileDataToAnalyze"
														   :ringing-frequency="frequency"
														   :input-shapers="inputShapers"
														   :input-shaper-frequency="frequency"
														   :input-shaper-damping="damping"
														   :estimate-shaper-effect="estimateShaperEffect"
														   :show-values="showOriginalValues"
														   :wide-band="wideBand" />
									</v-card>
								</v-col>
							</v-row>
						</div>
					</v-window-item>
				</v-window>
			</v-card>
		</v-col>

		<v-col cols="auto">
			<v-card>
				<v-card-title class="pb-2">
					<v-icon class="mr-1">mdi-transition</v-icon>
					{{ $t("plugins.accelerometer.inputShapers") }}
				</v-card-title>
				<v-card-text class="d-flex flex-column">
					<InputShaperCheckbox v-model="inputShapers" value="none" :current="shaping.type" class="mt-0" />
					<InputShaperCheckbox v-model="inputShapers" value="mzv" :current="shaping.type" />
					<InputShaperCheckbox v-model="inputShapers" value="zvd" :current="shaping.type" />
					<InputShaperCheckbox v-model="inputShapers" value="zvdd" :current="shaping.type" />
					<InputShaperCheckbox v-model="inputShapers" value="zvddd" :current="shaping.type" />
					<InputShaperCheckbox v-model="inputShapers" value="ei2" :current="shaping.type" />
					<InputShaperCheckbox v-model="inputShapers" value="ei3" :current="shaping.type" />
					<InputShaperCheckbox v-model="inputShapers" value="custom" :current="shaping.type">
						<v-menu v-model="customMenu" :close-on-content-click="false" :max-width="380">
							<template #activator="{ props: activatorProps }">
								<v-chip v-if="!uiStore.uiFrozen" v-bind="activatorProps" size="x-small"
										:color="shaping.type === 'custom' ? 'success' : 'info'">
									{{ $t("plugins.accelerometer.edit") }}
								</v-chip>
							</template>

							<v-card>
								<v-card-title>{{ $t("plugins.accelerometer.customShaper") }}</v-card-title>
								<v-card-text class="pb-2">
									<v-select v-model="numCustomCoefficients"
											  :label="$t('plugins.accelerometer.numImpulses')"
											  :items="[0, 1, 2, 3, 4]" hide-details density="compact"
											  variant="outlined" />
								</v-card-text>

								<v-table v-if="numCustomCoefficients > 0" density="compact">
									<thead>
										<tr>
											<th class="text-center">{{ $t("plugins.accelerometer.impulse") }}</th>
											<th>{{ $t("plugins.accelerometer.amplitude") }}</th>
											<th>{{ $t("plugins.accelerometer.durationMs") }}</th>
										</tr>
									</thead>
									<tbody>
										<tr v-for="(_, index) in customAmplitudes" :key="index">
											<td class="text-center">{{ index + 1 }}</td>
											<td>
												<v-text-field type="number" min="0" step="0.001"
															  :model-value="customAmplitudes[index]"
															  density="compact" variant="plain" hide-details
															  @update:model-value="(v) => setCustomAmplitude(index, v as string)" />
											</td>
											<td>
												<v-text-field type="number" min="0" step="0.1"
															  :model-value="customDelays[index] * 1000"
															  density="compact" variant="plain" hide-details
															  @update:model-value="(v) => setCustomDuration(index, v as string)" />
											</td>
										</tr>
									</tbody>
								</v-table>
								<v-divider v-if="numCustomCoefficients > 0" />

								<v-card-text v-if="customShaperCode" class="pb-0">
									<label>{{ $t("plugins.accelerometer.resultingCode") }}</label>
									<div class="d-flex align-center">
										<input ref="customShaperCodeRef" type="text" :value="customShaperCode"
											   class="flex-grow-1" readonly @click="selectInput" />
										<v-icon size="small" class="ml-1" @click="copyShaperCode">mdi-content-copy</v-icon>
									</div>
								</v-card-text>

								<v-card-actions class="justify-center">
									<v-btn variant="text" :disabled="!canConfigureCustom"
										   :loading="configuringCustomShaper" color="primary"
										   @click="configureCustomShaper">
										<v-icon class="mr-1">mdi-check</v-icon>
										{{ $t("plugins.accelerometer.apply") }}
									</v-btn>
								</v-card-actions>
							</v-card>
						</v-menu>
					</InputShaperCheckbox>

					<v-divider class="mt-3" />

					<v-text-field v-model.number="frequency" type="number" min="10" step="1" max="1000"
								  :disabled="uiStore.uiFrozen"
								  :label="$t('plugins.accelerometer.centreFrequency')" class="mt-3"
								  hide-details density="compact" variant="outlined"
								  @keydown.enter.prevent="setFrequency">
						<template #append-inner>Hz</template>
						<template #append>
							<v-icon class="ml-1" :disabled="!canSetFrequency" @click="setFrequency">mdi-check</v-icon>
						</template>
					</v-text-field>

					<v-text-field v-model.number="damping" type="number" min="0" step="0.01" max="0.99"
								  :disabled="uiStore.uiFrozen"
								  :label="$t('plugins.accelerometer.dampingFactor')" class="mt-3"
								  hide-details density="compact" variant="outlined"
								  @keydown.enter.prevent="setDamping">
						<template #append>
							<v-icon class="ml-1" :disabled="!canSetDamping" @click="setDamping">mdi-check</v-icon>
						</template>
					</v-text-field>
				</v-card-text>
			</v-card>
		</v-col>

		<RecordMotionProfileDialog :last-run="lastRun" v-model:shown="showDataCollection"
								   @finished="recordingFinished" />
	</v-row>
</template>

<script setup lang="ts">
import { DirectoryNotFoundError } from "@duet3d/connectors";
import { type InputShaping as InputShapingModel, InputShapingType } from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import { getErrorMessage } from "@/utils/errors";
import Events from "@/utils/events";
import Path from "@/utils/path";

import InputShaperCheckbox from "./InputShaperCheckbox.vue";
import InputShapingChart from "./InputShapingChart.vue";
import InputShapingFileList from "./InputShapingFileList.vue";
import RecordMotionProfileDialog from "./RecordMotionProfileDialog.vue";

const machineStore = useMachineStore();
const uiStore = useUiStore();

const shaping = computed<InputShapingModel>(() => machineStore.model.move.shaping);

const isInputShapingEnabled = computed(() => shaping.value.type !== InputShapingType.none);
// 81 entries cover 10-90Hz at 1Hz resolution - the default sweep for the "Current Settings" tab
const currentFrequencies = computed(() => Array.from({ length: 81 }, (_, index) => index + 10));

const tab = ref<"current" | "analysis">("current");
const showDataCollection = ref(false);

const inputShapers = ref<Array<string>>([]);
const customAmplitudes = ref<Array<number>>([]);
const customDelays = ref<Array<number>>([]);
const customMenu = ref(false);
const configuringCustomShaper = ref(false);
const frequency = ref(0);
const damping = ref(0.1);

const files = ref<Array<string>>([]);
const filesLastModified = ref<Array<Date>>([]);
const loadingFiles = ref(false);
const filesError = ref<string | null>(null);

const filesToAnalyze = ref<Array<string>>([]);
const fileFrequenciesToAnalyze = ref<Array<number> | null>(null);
const fileDataToAnalyze = ref<Record<string, number[]> | null>(null);
const showOriginalValues = ref(true);
const estimateShaperEffect = ref(false);
const sampleStartIndex = ref<number | null>(null);
const sampleEndIndex = ref<number | null>(null);
const hadOverflow = ref(false);
const wideBand = ref(false);

const customShaperCodeRef = ref<HTMLInputElement | null>(null);

const lastRun = computed(() => {
	let last = 0;
	for (const filename of files.value) {
		const match = /^(\d+)-/.exec(filename);
		if (match) {
			const run = parseInt(match[1]);
			if (run > last) last = run;
		}
	}
	return last;
});

const numCustomCoefficients = computed<number>({
	get: () => customAmplitudes.value.length,
	set: (value) => {
		if (customAmplitudes.value.length > value) {
			customAmplitudes.value.splice(value);
			customDelays.value.splice(value);
		} else {
			for (let i = customAmplitudes.value.length; i < value; i++) {
				customAmplitudes.value.push(0);
				customDelays.value.push(0);
			}
		}
	},
});

const canConfigureCustom = computed(() =>
	numCustomCoefficients.value > 0
	&& customAmplitudes.value.every((a) => a > 0)
	&& customDelays.value.every((d) => d > 0));

const customShaperCode = computed(() => {
	if (inputShapers.value.includes("custom") && canConfigureCustom.value) {
		const amplitudes = customAmplitudes.value.map((a) => a.toFixed(3)).join(":");
		const delays = customDelays.value.map((d) => d.toFixed(4)).join(":");
		return `M593 P"custom" H${amplitudes} T${delays}`;
	}
	return "";
});

const canSetFrequency = computed(() =>
	!uiStore.uiFrozen && !Number.isNaN(frequency.value) && frequency.value !== shaping.value.frequency);

const canSetDamping = computed(() =>
	!uiStore.uiFrozen && !Number.isNaN(damping.value) && damping.value !== shaping.value.damping);

// ---- Custom-shaper helpers --------------------------------------------------------------

function setCustomAmplitude(index: number, value: string) {
	const val = parseFloat(value);
	if (!Number.isNaN(val) && val >= 0) {
		customAmplitudes.value[index] = val;
	}
}

function setCustomDuration(index: number, value: string) {
	const val = parseFloat(value);
	if (!Number.isNaN(val) && val >= 0) {
		customDelays.value[index] = val / 1000;
	}
}

function selectInput(e: Event) {
	(e.target as HTMLInputElement).select();
}

async function copyShaperCode() {
	if (!customShaperCode.value) return;
	try {
		await navigator.clipboard.writeText(customShaperCode.value);
	} catch {
		customShaperCodeRef.value?.focus();
		customShaperCodeRef.value?.select();
		document.execCommand("copy");
	}
}

async function configureCustomShaper() {
	configuringCustomShaper.value = true;
	try {
		await machineStore.sendCode(customShaperCode.value);
	} catch (e) {
		console.warn(e);
	} finally {
		customMenu.value = false;
		configuringCustomShaper.value = false;
	}
}

async function setFrequency() {
	if (canSetFrequency.value) {
		await machineStore.sendCode(`M593 F${frequency.value}`);
	}
}

async function setDamping() {
	if (canSetDamping.value) {
		await machineStore.sendCode(`M593 S${damping.value}`);
	}
}

// ---- Files ------------------------------------------------------------------------------

async function refresh() {
	if (!machineStore.isConnected) {
		files.value = [];
		filesLastModified.value = [];
		loadingFiles.value = false;
		filesError.value = null;
		return;
	}

	if (loadingFiles.value) {
		return;
	}

	loadingFiles.value = true;
	filesError.value = null;
	try {
		interface FileEntry { isDirectory: boolean; name: string; lastModified: Date; }
		const list = (await machineStore.getFileList(Path.accelerometer)) as Array<FileEntry>;
		const filtered = list.filter((file) => !file.isDirectory && file.name !== Path.filamentsFile && file.name.endsWith(".csv"));
		filtered.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
		files.value = filtered.map((file) => file.name);
		filesLastModified.value = filtered.map((file) => file.lastModified);
	} catch (e) {
		if (e instanceof DirectoryNotFoundError) {
			files.value = [];
			filesLastModified.value = [];
		} else {
			filesError.value = getErrorMessage(e);
		}
	} finally {
		loadingFiles.value = false;
	}
}

function filesOrDirectoriesChanged(payload: { files?: Array<string> }) {
	if (payload.files === undefined) {
		return;
	}
	if (filesToAnalyze.value.some((fileToAnalyze) => payload.files!.includes(Path.combine(Path.accelerometer, fileToAnalyze)))) {
		// File under analysis was touched - drop the selection so the FileList rebuilds cleanly
		filesToAnalyze.value = [];
	} else if (payload.files.some((file) => file.endsWith(".csv")) && Path.filesAffectDirectory(payload.files, Path.accelerometer)) {
		refresh();
	}
}

function recordingFinished() {
	tab.value = "analysis";
	refresh();
}

// ---- Lifecycle / watches ------------------------------------------------------------------

onMounted(() => {
	refresh();

	const initial = shaping.value;
	if (initial.type === "none") {
		inputShapers.value = [];
	} else {
		inputShapers.value.push(initial.type);
	}
	frequency.value = initial.frequency;
	damping.value = initial.damping;
	customAmplitudes.value = initial.amplitudes.slice();
	customDelays.value = initial.delays.slice();

	Events.on("filesOrDirectoriesChanged", filesOrDirectoriesChanged);
});

onBeforeUnmount(() => {
	Events.off("filesOrDirectoriesChanged", filesOrDirectoriesChanged);
});

watch(() => shaping.value.type, (to) => {
	if (to === "none") {
		inputShapers.value = [];
	} else {
		if (!inputShapers.value.includes(to)) {
			inputShapers.value.push(to);
		}
		if (to === "custom") {
			customAmplitudes.value = shaping.value.amplitudes.slice();
			customDelays.value = shaping.value.delays.slice();
		}
	}
});

watch(() => shaping.value.amplitudes, (to) => {
	if (!inputShapers.value.includes("custom") || shaping.value.type === "custom") {
		customAmplitudes.value = to.slice();
	}
}, { deep: true });

watch(() => shaping.value.delays, (to) => {
	if (!inputShapers.value.includes("custom") || shaping.value.type === "custom") {
		customDelays.value = to.slice();
	}
}, { deep: true });

watch(() => shaping.value.frequency, (to) => { frequency.value = to; });
watch(() => shaping.value.damping, (to) => { damping.value = to; });
</script>

<style scoped>
.content {
	position: relative;
	min-height: 480px;
}

.content canvas {
	position: absolute;
}
</style>
