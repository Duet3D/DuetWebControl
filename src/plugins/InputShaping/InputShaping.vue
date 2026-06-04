<style scoped>
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: 2rem;
}
.empty-state > div {
	max-width: 480px;
}

.content {
	position: relative;
	min-height: 320px;
}
@media (min-width: 840px) {
	.content {
		min-height: 480px;
	}
}

.content canvas {
	position: absolute;
}

/* When the Motion Analysis col stacks below the file list (xs/sm) the col has no parent height
   to fill, so the canvas inside collapses to 0. Give the chart wrapper a sensible minimum so
   it actually paints on small screens - kept short on sm so the surrounding panels fit in the
   viewport without scrolling */
.analysis-chart-col {
	min-height: 260px;
}
@media (min-width: 840px) {
	.analysis-chart-col {
		min-height: 0;
	}
}

/* Let the v-window inner element grow into the page-fill card and propagate that to each
   window-item so charts can size against the actual viewport-relative height */
.input-shaping-window :deep(.v-window__container),
.input-shaping-window :deep(.v-window-item) {
	height: 100%;
}
</style>

<template>
	<v-row class="ma-0">
		<v-col cols="12" md="9" lg="9" xl="10">
			<!-- Page-fill only on md+ - at xs/sm the inner layout stacks (file list above chart)
				 and forcing viewport height would push the chart off the bottom of the card -->
			<v-card :class="['d-flex', 'flex-column', { 'dwc-page-fill': mdAndUp }]">
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
					<v-btn color="success" icon variant="text"
						   class="align-self-center ml-auto mr-2 d-md-none"
						   :disabled="uiStore.uiFrozen" :title="$t('plugins.accelerometer.recordButton')"
						   @click="showDataCollection = true">
						<v-icon>mdi-record</v-icon>
					</v-btn>
				</v-tabs>

				<v-window v-model="tab" :touch="false" class="flex-grow-1 d-flex flex-column input-shaping-window">
					<v-window-item value="current" class="h-100">
						<div class="d-flex flex-column h-100">
							<div v-if="!isInputShapingEnabled" class="empty-state flex-grow-1">
								<v-icon size="64" color="info" class="mb-4">mdi-tune-variant</v-icon>
								<div class="text-body-1 text-medium-emphasis mb-6">
									{{ $t("plugins.accelerometer.notConfigured") }}
								</div>
								<v-btn color="success" size="large" :disabled="uiStore.uiFrozen"
									   @click="showDataCollection = true">
									<v-icon class="mr-1">mdi-record</v-icon>
									{{ $t("plugins.accelerometer.recordButton") }}
								</v-btn>
							</div>
							<!-- v-if (not v-show) so the heavy Chart instance only instantiates
								 when input shaping is actually configured -->
							<div v-else class="content flex-grow-1 pa-2">
								<InputShapingChart :frequencies="currentFrequencies" :ringing-frequency="frequency"
												   :input-shapers="inputShapers" :input-shaper-frequency="frequency"
												   :input-shaper-damping="damping" :wide-band="false" />
							</div>
						</div>
					</v-window-item>

					<v-window-item value="analysis" class="h-100">
						<div class="d-flex flex-column h-100">
							<v-progress-linear :active="loadingFiles" indeterminate />
							<v-alert v-if="filesError" type="error" class="mb-0 flex-grow-0" variant="tonal">
								{{ filesError }}
							</v-alert>
							<div v-else-if="files.length === 0 && !loadingFiles" class="empty-state flex-grow-1">
								<v-icon size="64" color="info" class="mb-4">mdi-file-search</v-icon>
								<div class="text-body-1 text-medium-emphasis mb-6">
									{{ $t("plugins.accelerometer.noMotionProfiles") }}
									<a href="javascript:void(0)" class="text-decoration-underline ml-1" @click="refresh">
										{{ $t("plugins.accelerometer.refreshLink") }}
									</a>
								</div>
								<v-btn color="success" size="large" :disabled="uiStore.uiFrozen"
									   @click="showDataCollection = true">
									<v-icon class="mr-1">mdi-record</v-icon>
									{{ $t("plugins.accelerometer.recordButton") }}
								</v-btn>
							</div>
							<v-row v-if="files.length > 0" class="content pa-2 ma-0 flex-grow-1">
								<v-col cols="12" md="6" lg="5" xl="4" class="d-flex pa-0">
									<InputShapingFileList class="flex-grow-1" :title="$t('plugins.accelerometer.motionProfiles')"
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
								<v-col v-if="filesToAnalyze.length === 0" cols="12" md="6" lg="7" xl="8"
									   class="d-flex align-center justify-center">
									{{ $t("plugins.accelerometer.pickProfile") }}
								</v-col>
								<v-col v-else cols="12" md="6" lg="7" xl="8" class="d-flex flex-column pa-0 analysis-chart-col">
									<v-alert v-if="hadOverflow" type="warning" variant="tonal" class="mb-0 flex-grow-0">
										{{ $t("plugins.accelerometer.overflowWarning") }}
									</v-alert>
									<div class="d-block fill-height pa-2">
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
									</div>
								</v-col>
							</v-row>
						</div>
					</v-window-item>
				</v-window>
			</v-card>
		</v-col>

		<v-col cols="12" md="3" lg="3" xl="2">
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
import { useDisplay } from "vuetify";

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
const { mdAndUp } = useDisplay();

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
			if (run > last) {
				last = run;
			}
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

// #region Custom-shaper helpers
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
	if (!customShaperCode.value) {
		return;
	}
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

// #endregion

// #region Files
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

// #endregion

// #region Lifecycle / watches
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

// #endregion
</script>
