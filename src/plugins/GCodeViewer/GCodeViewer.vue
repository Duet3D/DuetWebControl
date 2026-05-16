<!-- 3D GCode visualiser. Wraps @sindarius/gcodeviewer with a Vuetify settings drawer, a Monaco
	 code-stream side panel, scrub controls and a fullscreen mode that floats a tool-position +
	 heater-temperature overlay on top of the canvas. Cached UI prefs (per-tool colour, HQ
	 rendering, specular, viewGCode toggle, zBelt, workplace overlay) round-trip through the
	 cache store under the GCodeViewer key. The viewer instance is module-scope (intentionally
	 not reactive - Vue's proxy would mangle Babylon's internal bookkeeping) -->
<template>
	<div ref="primaryContainer" class="primary-container mt-2">
		<div :class="{ 'full-screen': fullscreen }" class="viewer-box">
			<div v-if="fullscreen" :class="emergencyButtonClass">
				<CodeButton :code="'M112\nM999'" :log="false" :title="$t('button.emergencyStop.title')" color="error">
					<v-icon>mdi-flash</v-icon>
				</CodeButton>
			</div>

			<CodeStream :shown="viewGCode" :is-simulating="scrubPlaying" :document="fileData"
						:class="codeViewClass" :currentline="scrubPosition" @changed="scrubPositionChanged" />

			<canvas ref="viewerCanvas" :title="hoverLabel" :class="viewerClass" />

			<FSOverlay v-show="fullscreen && showOverlay" :class="[viewerClass, 'fsoverlay']"
					   :viewgcode="viewGCode" />

			<div class="loading-progress">
				<v-progress-linear v-show="loading" :model-value="loadingProgress" class="disable-transition"
								   height="15" rounded>
					{{ loadingProgress }}% {{ loadingMessage }}
				</v-progress-linear>
			</div>

			<div :class="{ 'button-container-drawer': drawer }" class="button-container">
				<v-btn :title="$t('plugins.gcodeViewer.fullscreen')" class="full-screen-icon mb-2"
					   color="secondary" size="small" @click="toggleFullScreen">
					<v-icon>{{ fullscreen ? "mdi-window-restore" : "mdi-window-maximize" }}</v-icon>
				</v-btn>
				<br />
				<v-btn :title="$t('plugins.gcodeViewer.showConfiguration')" class="mb-10"
					   color="secondary" size="small" @click="drawer = !drawer">
					<v-icon>mdi-cog</v-icon>
				</v-btn>
				<br />
				<v-btn v-if="isJobRunning && !loading && !visualizingCurrentJob"
					   :title="$t('plugins.gcodeViewer.loadCurrentJob.title')" class="mb-10"
					   color="secondary" size="small" @click="loadRunningJob">
					<v-icon>mdi-printer-3d</v-icon>
				</v-btn>
				<br />
				<v-btn v-if="loading" :title="$t('plugins.gcodeViewer.cancelLoad')"
					   color="warning" size="small" @click="cancelLoad">
					<v-icon color="red">mdi-cancel</v-icon>
				</v-btn>
			</div>

			<v-navigation-drawer v-model="drawer" location="left" temporary width="350"
								 class="drawer-zindex">
				<v-card>
					<v-btn :title="$t('plugins.gcodeViewer.resetCamera.title')" block color="primary"
						   @click="reset">
						<v-icon class="mr-2">mdi-camera</v-icon>
						{{ $t("plugins.gcodeViewer.resetCamera.caption") }}
					</v-btn>
					<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.reloadView.title')" block
						   class="mt-2" color="primary" @click="reloadviewer">
						<v-icon class="mr-2">mdi-reload-alert</v-icon>
						{{ $t("plugins.gcodeViewer.reloadView.caption") }}
					</v-btn>
					<v-btn :disabled="!isJobRunning || loading || visualizingCurrentJob"
						   :title="$t('plugins.gcodeViewer.loadCurrentJob.title')" block class="mt-2"
						   color="secondary" @click="loadRunningJob">
						<v-icon class="mr-2">mdi-printer-3d</v-icon>
						{{ $t("plugins.gcodeViewer.loadCurrentJob.caption") }}
					</v-btn>
					<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.unloadGCode.title')" block
						   class="mt-2" color="primary" @click="clearScene">
						<v-icon class="mr-2">mdi-video-3d-off</v-icon>
						{{ $t("plugins.gcodeViewer.unloadGCode.caption") }}
					</v-btn>
					<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.loadLocalGCode.title')" block
						   class="mt-2" color="primary" @click="chooseFile">
						<v-icon>mdi-file</v-icon>
						{{ $t("plugins.gcodeViewer.loadLocalGCode.caption") }}
					</v-btn>
					<input ref="fileInput" type="file" accept=".g,.gcode,.gc,.gco,.nc,.ngc,.tap" hidden multiple
						   @change="fileSelected" />

					<v-switch v-model="showObjectSelection" :disabled="!canCancelObject"
							  :label="jobSelectionLabel" color="primary" hide-details class="mt-4" />
					<v-switch v-model="showCursor" :label="$t('plugins.gcodeViewer.showCursor')"
							  color="primary" hide-details />
					<v-switch v-model="showTravelLines" :label="$t('plugins.gcodeViewer.showTravels')"
							  color="primary" hide-details />
					<v-switch v-model="persistTravels" :label="$t('plugins.gcodeViewer.persistTravels')"
							  color="primary" hide-details />
					<v-switch v-model="viewGCode" :label="$t('plugins.gcodeViewer.viewGCode')"
							  color="primary" hide-details />
				</v-card>

				<v-expansion-panels>
					<v-expansion-panel>
						<v-expansion-panel-title :title="$t('plugins.gcodeViewer.renderQuality.title')">
							<v-icon class="mr-2">mdi-checkerboard</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.renderQuality.caption") }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text eager>
							<v-btn-toggle v-model="renderQuality" mandatory class="btn-toggle d-flex">
								<v-btn :disabled="loading" :value="1" block>{{ $t("plugins.gcodeViewer.sbc") }}</v-btn>
								<v-btn :disabled="loading" :value="2" block>{{ $t("plugins.gcodeViewer.low") }}</v-btn>
								<v-btn :disabled="loading" :value="3" block>{{ $t("plugins.gcodeViewer.medium") }}</v-btn>
								<v-btn :disabled="loading" :value="4" block>{{ $t("plugins.gcodeViewer.high") }}</v-btn>
								<v-btn :disabled="loading" :value="5" block>{{ $t("plugins.gcodeViewer.ultra") }}</v-btn>
								<v-btn :disabled="loading" :value="6" block>{{ $t("plugins.gcodeViewer.max") }}</v-btn>
							</v-btn-toggle>
							<v-checkbox v-model="useHQRendering" :label="$t('plugins.gcodeViewer.useHQRendering')"
										color="primary" hide-details class="mt-4" />
							<v-checkbox v-model="forceWireMode"
										:label="$t('plugins.gcodeViewer.forceLineRendering')"
										color="primary" hide-details />
							<v-checkbox v-model="perimeterOnly" :label="$t('plugins.gcodeViewer.perimeterOnly')"
										color="primary" hide-details />
							<v-checkbox v-model="progressMode" :label="$t('plugins.gcodeViewer.progressMode')"
										color="primary" hide-details />
							<v-checkbox v-model="vertexAlpha" :label="$t('plugins.gcodeViewer.transparency')"
										color="primary" hide-details />
							<v-slider v-if="vertexAlpha" v-model="transparencyPercent" min="1" max="100"
									  hide-details />
							<v-checkbox v-model="specular" :label="$t('plugins.gcodeViewer.useSpecular')"
										color="primary" hide-details />
						</v-expansion-panel-text>
					</v-expansion-panel>

					<v-expansion-panel>
						<v-expansion-panel-title :title="$t('plugins.gcodeViewer.extruders.title')">
							<v-icon class="mr-2">mdi-printer-3d-nozzle</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.extruders.caption") }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text>
							<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.reloadView.title')" block
								   class="mb-2" color="primary" @click="reloadviewer">
								{{ $t("plugins.gcodeViewer.reloadView.caption") }}
							</v-btn>
							<v-card v-for="(extruder, index) in toolColors" :key="index">
								<v-card-title>
									<h3>{{ $t("plugins.gcodeViewer.tool", [index]) }}</h3>
								</v-card-title>
								<v-card-text>
									<ColorPicker :editcolor="extruder"
												 @updatecolor="(value) => updateColor(index, value)" />
								</v-card-text>
							</v-card>
							<v-card>
								<v-btn block class="mt-4" color="warning" @click="resetExtruderColors">
									{{ $t("plugins.gcodeViewer.resetColor", toolColors.length) }}
								</v-btn>
							</v-card>
						</v-expansion-panel-text>
					</v-expansion-panel>

					<v-expansion-panel>
						<v-expansion-panel-title :title="$t('plugins.gcodeViewer.renderMode.title')">
							<v-icon class="mr-2">mdi-palette</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.renderMode.caption", 2) }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text>
							<v-card>
								<h4>{{ $t("plugins.gcodeViewer.renderMode.caption", 2) }}</h4>
								<v-btn-toggle v-model="colorMode" mandatory class="btn-toggle d-flex">
									<v-btn :disabled="loading" :value="0" block>{{ $t("plugins.gcodeViewer.color") }}</v-btn>
									<v-btn :disabled="loading" :value="1" block>{{ $t("plugins.gcodeViewer.feedrate") }}</v-btn>
									<v-btn :disabled="loading" :value="2" block>{{ $t("plugins.gcodeViewer.feature") }}</v-btn>
								</v-btn-toggle>
								<v-checkbox v-model="g1AsExtrusion" :label="$t('plugins.gcodeViewer.g1AsExtrusion')"
											color="primary" hide-details class="mt-3" />
								<h4>{{ $t("plugins.gcodeViewer.minFeedrate") }}</h4>
								<v-slider v-model="minColorRate" :max="500" :min="5" thumb-label hide-details />
								<h4>{{ $t("plugins.gcodeViewer.maxFeedrate") }}</h4>
								<v-slider v-model="maxColorRate" :max="500" :min="5" thumb-label hide-details />
							</v-card>
							<v-card>
								<v-card-title>
									<h4>{{ $t("plugins.gcodeViewer.minFeedrateColor") }}</h4>
								</v-card-title>
								<v-card-text>
									<ColorPicker :editcolor="minFeedColor"
												 @updatecolor="(value) => updateMinFeedColor(value)" />
								</v-card-text>
							</v-card>
							<v-card>
								<v-card-title>
									<h4>{{ $t("plugins.gcodeViewer.maxFeedrateColor") }}</h4>
								</v-card-title>
								<v-card-text>
									<ColorPicker :editcolor="maxFeedColor"
												 @updatecolor="(value) => updateMaxFeedColor(value)" />
								</v-card-text>
							</v-card>
							<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.reloadView.title')" block
								   class="mb-2" color="primary" @click="reloadviewer">
								{{ $t("plugins.gcodeViewer.reloadView.caption") }}
							</v-btn>
						</v-expansion-panel-text>
					</v-expansion-panel>

					<v-expansion-panel>
						<v-expansion-panel-title :title="$t('plugins.gcodeViewer.progress.title')">
							<v-icon class="mr-2">mdi-progress-clock</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.progress.caption") }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text>
							<v-card>
								<div>{{ $t("plugins.gcodeViewer.topClipping") }}</div>
								<v-slider v-model="sliderHeight" :max="maxHeight" :min="minHeight" step="0.1"
										  thumb-label hide-details />
								<div>{{ $t("plugins.gcodeViewer.bottomClipping") }}</div>
								<v-slider v-model="sliderBottomHeight" :max="maxHeight" :min="minHeight" step="0.1"
										  thumb-label hide-details />
							</v-card>
							<v-card>
								<v-card-title>{{ $t("plugins.gcodeViewer.progressColor") }}</v-card-title>
								<v-card-text>
									<ColorPicker :editcolor="progressColor"
												 @updatecolor="(value) => updateProgressColor(value)" />
								</v-card-text>
							</v-card>
						</v-expansion-panel-text>
					</v-expansion-panel>

					<v-expansion-panel>
						<v-expansion-panel-title>
							<v-icon class="mr-2">mdi-cog</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.settings") }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text>
							<v-card>
								<v-card-title>{{ $t("plugins.gcodeViewer.background") }}</v-card-title>
								<v-card-text>
									<ColorPicker :editcolor="backgroundColor"
												 @updatecolor="(value) => updateBackground(value)" />
								</v-card-text>
							</v-card>
							<v-card>
								<v-card-title>{{ $t("plugins.gcodeViewer.bedRenderMode") }}</v-card-title>
								<v-card-text>
									<v-btn-toggle v-model="bedRenderMode" mandatory class="d-flex flex-column">
										<v-btn :value="0" block>{{ $t("plugins.gcodeViewer.bed") }}</v-btn>
										<v-btn :value="1" block>{{ $t("plugins.gcodeViewer.volume") }}</v-btn>
									</v-btn-toggle>
									<br />
									<ColorPicker :editcolor="bedColor"
												 @updatecolor="(value) => updateBedColor(value)" />
								</v-card-text>
							</v-card>
							<v-card>
								<v-card-text>
									<v-checkbox v-model="showOverlay" :label="$t('plugins.gcodeViewer.showFSOverlay')"
												color="primary" hide-details />
									<v-checkbox v-model="showAxes" :label="$t('plugins.gcodeViewer.showAxes')"
												color="primary" hide-details />
									<v-checkbox v-model="showObjectLabels"
												:label="$t('plugins.gcodeViewer.showObjectLabels')"
												color="primary" hide-details />
									<v-checkbox v-model="showWorkplace"
												:label="$t('plugins.gcodeViewer.showWorkplace')"
												color="primary" hide-details />
									<v-switch v-model="cameraInertia" :label="$t('plugins.gcodeViewer.cameraInertia')"
											  color="primary" hide-details />
									<v-switch v-model="zBelt" :label="$t('plugins.gcodeViewer.zBelt')"
											  color="primary" hide-details />
									<v-text-field v-model.number="zBeltAngle" type="number"
												  :label="$t('plugins.gcodeViewer.zBeltAngle')"
												  density="compact" variant="outlined" hide-details />
								</v-card-text>
							</v-card>
						</v-expansion-panel-text>
					</v-expansion-panel>
				</v-expansion-panels>
			</v-navigation-drawer>

			<div v-show="!visualizingCurrentJob && scrubFileSize > 0"
				 :class="[{ 'button-container-drawer': drawer }, scrubberClass]">
				<v-row class="scrubber-row">
					<v-col cols="10" md="6">
						<v-slider v-model="scrubPosition" :hint="`${scrubPosition}/${scrubFileSize}`"
								  :max="scrubFileSize" min="0" density="compact" persistent-hint hide-details
								  @update:model-value="scrubPositionChanged" />
					</v-col>
					<v-col cols="2">
						<v-row dense>
							<v-col cols="12">
								<v-btn @click="simulatePlay">
									<v-icon v-if="scrubPlaying">mdi-stop</v-icon>
									<v-icon v-else>mdi-play</v-icon>
								</v-btn>
								<v-btn @click="fastForward">
									<v-icon>mdi-fast-forward</v-icon>
								</v-btn>
							</v-col>
						</v-row>
					</v-col>
					<v-col cols="12" md="2">
						<v-btn-toggle v-model="scrubSpeed" mandatory rounded>
							<v-btn :value="1">1x</v-btn>
							<v-btn :value="2">2x</v-btn>
							<v-btn :value="5">5x</v-btn>
							<v-btn :value="10">10x</v-btn>
							<v-btn :value="20">20x</v-btn>
							<v-btn :value="100">100x</v-btn>
						</v-btn-toggle>
					</v-col>
				</v-row>
			</div>
		</div>

		<v-dialog v-model="objectDialogData.showDialog" max-width="300">
			<v-card>
				<v-card-title class="headline">
					<v-icon class="mr-2">
						{{ objectDialogData.info.cancelled ? "mdi-reload" : "mdi-cancel" }}
					</v-icon>
					{{ objectDialogData.info.cancelled
						? $t("plugins.gcodeViewer.resumeObj")
						: $t("plugins.gcodeViewer.cancelObj") }}
				</v-card-title>
				<v-card-text>{{ objectDialogData.info.name }}</v-card-text>
				<v-card-actions>
					<v-btn width="130" color="primary" @click="objectDialogCancelObject">
						{{ objectDialogData.info.cancelled
							? $t("plugins.gcodeViewer.resumeObj")
							: $t("plugins.gcodeViewer.cancelObj") }}
					</v-btn>
					<v-spacer />
					<v-btn width="130" color="error" @click="objectDialogData.showDialog = false">
						{{ $t("generic.close") }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<script setup lang="ts">
import { type Axis, type Job, KinematicsName, type Move, type State } from "@duet3d/objectmodel";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { useDisplay } from "vuetify";
// @ts-ignore - third-party package without bundled types
import gcodeViewer from "@sindarius/gcodeviewer";

import CodeButton from "@/components/buttons/CodeButton.vue";
import i18n from "@/i18n";
import { PluginDataType, setPluginData } from "@/stores";
import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import { LogLevel, useUiStore } from "@/stores/ui";
import { isPrinting } from "@/utils/enums";
import Events from "@/utils/events";
import Path from "@/utils/path";

import CodeStream from "./CodeStream.vue";
import ColorPicker from "./ColorPicker.vue";
import FSOverlay from "./FSOverlay.vue";

interface ObjectInfo {
	cancelled: boolean;
	index: number;
	name?: string;
}

const machineStore = useMachineStore();
const cacheStore = useCacheStore();
const uiStore = useUiStore();
const display = useDisplay();

// Intentionally module-scope (not a ref) - Babylon's internals don't survive Vue's reactive
// proxy walk; the template never reads `viewer` directly so losing reactivity is safe
let viewer: any = null;

const primaryContainer = ref<HTMLElement | null>(null);
const viewerCanvas = ref<HTMLCanvasElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const drawer = ref(false);
const backgroundColor = ref("#000000FF");
const progressColor = ref("#FFFFFFFF");
const loading = ref(false);
// Backed by the cache store below (computed proxy); the ref was a v3.7-dev leftover that
// stored the value in localStorage directly, bypassing the cache snapshot
const showTravelLines = ref(false);
const persistTravels = ref(false);
const selectedFile = ref("");
const renderQuality = ref(1);
const maxHeight = ref(0);
const minHeight = ref(0);
const sliderHeight = ref(0);
const sliderBottomHeight = ref(0);
const forceWireMode = ref(false);
const vertexAlpha = ref(false);
const showObjectSelection = ref(false);
const objectDialogData = reactive({
	showDialog: false,
	info: {} as ObjectInfo,
});
const hoverLabel = ref("");
const bedRenderMode = ref(0);
const showAxes = ref(true);
const showObjectLabels = ref(true);
const fullscreen = ref(false);
const bedColor = ref("");
const colorMode = ref(0);
const minColorRate = ref(20);
const maxColorRate = ref(60);
const maxFileFeedRate = ref(0);
const minFeedColor = ref("#0000FF");
const maxFeedColor = ref("#FF0000");
const cameraInertia = ref(true);
const loadingProgress = ref(0);
const loadingMessage = ref("");
const showOverlay = ref(true);
const scrubPosition = ref(0);
const scrubFileSize = ref(0);
const scrubPlaying = ref(false);
const scrubSpeed = ref(1);
let colorDebounce: ReturnType<typeof setTimeout> | null = null;
let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
const fileData = ref("");
const perimeterOnly = ref(false);
const transparencyPercent = ref(50);
const progressMode = ref(false);

// #region OM-derived computeds
const job = computed<Job>(() => machineStore.model.job);
const move = computed<Move>(() => machineStore.model.move);
const state = computed<State>(() => machineStore.model.state);
const pluginCache = computed<any>(() => cacheStore.plugins.GCodeViewer);

const isJobRunning = computed(() => isPrinting(state.value.status));

const visualizingCurrentJob = computed(() => {
	try {
		return job.value.file?.fileName === selectedFile.value && isJobRunning.value;
	} catch {
		return false;
	}
});

const filePosition = computed(() => Number(job.value.filePosition ?? 0));

const kinematicsName = computed(() => move.value.kinematics.name);
const isDelta = computed(() => kinematicsName.value === KinematicsName.linearDelta
	|| kinematicsName.value === KinematicsName.rotaryDelta);

const canCancelObject = computed(() => {
	try {
		if (!isJobRunning.value || (job.value.build?.objects?.length ?? 0) <= 0) {
			return false;
		}
		return visualizingCurrentJob.value;
	} catch {
		return false;
	}
});

const jobSelectionLabel = computed(() => {
	let label = i18n.global.t("plugins.gcodeViewer.showObjectSelection.caption");
	if (canCancelObject.value && job.value.build?.objects) {
		label += ` (${job.value.build.objects.length})`;
	}
	return label;
});

// #endregion

// #region Cached plugin settings
const toolColors = computed<string[]>({
	get: () => pluginCache.value?.toolColors ?? [],
	set: (value) => setPluginData("GCodeViewer", PluginDataType.cache, "toolColors", value),
});

const useHQRendering = computed<boolean>({
	get: () => pluginCache.value?.useHQRendering ?? false,
	set: (value) => setPluginData("GCodeViewer", PluginDataType.cache, "useHQRendering", value),
});

const specular = computed<boolean>({
	get: () => pluginCache.value?.useSpecular ?? true,
	set: (value) => setPluginData("GCodeViewer", PluginDataType.cache, "useSpecular", value),
});

const g1AsExtrusion = computed<boolean>({
	get: () => pluginCache.value?.g1AsExtrusion ?? false,
	set: (value) => setPluginData("GCodeViewer", PluginDataType.cache, "g1AsExtrusion", value),
});

const viewGCode = computed<boolean>({
	get: () => pluginCache.value?.viewGCode ?? false,
	set: (value) => {
		setPluginData("GCodeViewer", PluginDataType.cache, "viewGCode", value);
		if (viewer) {
			fileData.value = value ? viewer.fileData : "";
		}
		resize();
	},
});

const zBelt = computed<boolean>({
	get: () => pluginCache.value?.zBelt ?? false,
	set: (value) => setPluginData("GCodeViewer", PluginDataType.cache, "zBelt", value),
});

const zBeltAngle = computed<number>({
	get: () => pluginCache.value?.zBeltAngle ?? 45,
	set: (value) => setPluginData("GCodeViewer", PluginDataType.cache, "zBeltAngle", value),
});

const showWorkplace = computed<boolean>({
	get: () => pluginCache.value?.showWorkplace ?? true,
	set: (value) => setPluginData("GCodeViewer", PluginDataType.cache, "showWorkplace", value),
});

const showCursor = computed<boolean>({
	get: () => pluginCache.value?.showCursor ?? false,
	set: (value) => setPluginData("GCodeViewer", PluginDataType.cache, "showCursor", value),
});

// #endregion

// #region Layout-driven class swaps
const viewerClass = computed(() => {
	nextTick(() => resize());
	return viewGCode.value ? "babylon-canvas-codeview" : "babylon-canvas";
});

const scrubberClass = computed(() => {
	if (display.mdAndDown.value) {
		return viewGCode.value ? "scrubber-sm-codeview" : "scrubber-sm";
	}
	return viewGCode.value ? "scrubber-codeview" : "scrubber";
});

const codeViewClass = computed(() => (display.mdAndDown.value ? "codeview-sm" : "codeview"));
const emergencyButtonClass = computed(() => viewGCode.value
	? "emergency-button-placement-codeview"
	: "emergency-button-placement");

const workplaceOffsets = computed(() => {
	const offsets: number[] = [];
	try {
		for (const axis of move.value.axes) {
			offsets.push(...axis.workplaceOffsets);
		}
	} catch {
		// Defensive - if axes haven't loaded yet, empty list is fine
	}
	return offsets;
});

const currentWorkplace = computed(() => {
	return move.value.motionSystems[machineStore.selectedMotionSystem].workplaceNumber;
});

// #endregion

// #region Viewer lifecycle
async function viewModelEvent(path: string) {
	selectedFile.value = path;
	if (!viewer) return;
	try {
		const blob = await machineStore.download({
			filename: Path.combine(path),
			type: "text",
		}, false, false, false);
		loading.value = true;
		preLoadSettings();
		await viewer.processFile(blob);
		if (viewGCode.value) {
			fileData.value = viewer.fileData;
		}
		scrubFileSize.value = viewer.fileSize;
		viewer.gcodeProcessor.setLiveTracking(visualizingCurrentJob.value);
		setGCodeValues();
	} finally {
		loading.value = false;
	}
}

function onKeyUp(e: KeyboardEvent) {
	const key = e.key;
	if (key === "Escape" || key === "Esc") {
		fullscreen.value = false;
		nextTick(() => viewer?.resize());
	}
}

function onWindowResize() {
	nextTick(() => resize());
}

onMounted(async () => {
	if (!viewerCanvas.value) return;
	viewer = new gcodeViewer(viewerCanvas.value);
	viewer.fileData = "";
	await viewer.init();

	viewer.simulationMultiplier = 1;
	viewer.buildObjects.objectCallback = (selected: ObjectInfo) => {
		objectDialogData.showDialog = true;
		objectDialogData.info = selected;
	};
	viewer.buildObjects.labelCallback = (label: string) => {
		hoverLabel.value = showObjectSelection.value ? label : "";
	};
	showObjectLabels.value = viewer.buildObjects.showLabel;

	for (const axis of move.value.axes) {
		if ("XYZ".includes(axis.letter)) {
			const letter = axis.letter.toLowerCase() as "x" | "y" | "z";
			viewer.bed.buildVolume[letter].min = axis.min;
			viewer.bed.buildVolume[letter].max = axis.max;
		}
	}
	viewer.bed.commitBedSize();

	cameraInertia.value = viewer.cameraInertia;
	viewer.bed.setDelta(isDelta.value);
	bedRenderMode.value = viewer.bed.renderMode;
	bedColor.value = viewer.bed.getBedColor();
	showAxes.value = viewer.axes.visible;
	viewer.gcodeProcessor.useSpecularColor(specular.value);

	colorMode.value = viewer.gcodeProcessor.colorMode;
	minFeedColor.value = viewer.gcodeProcessor.minFeedColorString;
	maxFeedColor.value = viewer.gcodeProcessor.maxFeedColorString;
	minColorRate.value = viewer.gcodeProcessor.minColorRate / 60;
	maxColorRate.value = viewer.gcodeProcessor.maxColorRate / 60;
	forceWireMode.value = viewer.gcodeProcessor.forceWireMode;
	if (viewer.lastLoadFailed()) {
		renderQuality.value = 1;
		viewer.updateRenderQuality(1);
		uiStore.makeNotification(LogLevel.warning,
			i18n.global.t("plugins.gcodeViewer.caption"),
			i18n.global.t("plugins.gcodeViewer.renderFailed"), 5000);
		viewer.clearLoadFlag();
	}
	viewer.setCursorVisiblity(showCursor.value);
	renderQuality.value = viewer.renderQuality;
	backgroundColor.value = viewer.getBackgroundColor();
	progressColor.value = viewer.getProgressColor();
	viewer.gcodeProcessor.useHighQualityExtrusion(useHQRendering.value);
	viewer.gcodeProcessor.loadingProgressCallback = (progress: number, message: string | undefined) => {
		loadingProgress.value = Math.ceil(progress * 100);
		loadingMessage.value = message ?? "";
	};
	viewer.simulationUpdatePosition = (position: number) => {
		scrubPosition.value = position - 2;
	};
	viewer.simulationStopped = () => {
		scrubPlaying.value = false;
	};

	Events.on("view-3d-model", viewModelEvent);

	nextTick(() => {
		updateTools();
		updateWorkplaces();
	});

	window.addEventListener("keyup", onKeyUp);
	window.addEventListener("resize", onWindowResize);
});

onBeforeUnmount(() => {
	Events.off("view-3d-model", viewModelEvent);
	window.removeEventListener("keyup", onKeyUp);
	window.removeEventListener("resize", onWindowResize);
	if (colorDebounce) clearTimeout(colorDebounce);
	if (resizeDebounce) clearTimeout(resizeDebounce);
	viewer = null;
});

// #endregion

// #region Methods
function simulatePlay() {
	if (!viewer) return;
	if (scrubPlaying.value) {
		viewer.stopSimulation();
	} else {
		viewer.startSimulation();
	}
	scrubPlaying.value = viewer.simulation;
}

function scrubPositionChanged(value: number) {
	if (!viewer) return;
	const viewerState = viewer.simulation;
	viewer.simulation = false;
	nextTick(() => {
		scrubPosition.value = value;
		viewer.gcodeProcessor.updateFilePosition(value);
		viewer.simulateToolPosition();
		viewer.simulation = viewerState;
	});
}

function updateColor(index: number, value: string) {
	if (!viewer) return;
	const next = toolColors.value.slice();
	next[index] = value;
	viewer.gcodeProcessor.updateTool(value, 0.4, index);
	if (colorDebounce) {
		clearTimeout(colorDebounce);
	}
	colorDebounce = setTimeout(() => {
		setPluginData("GCodeViewer", PluginDataType.cache, "toolColors", next);
		viewer?.gcodeProcessor.forceRedraw();
	}, 200);
}

function updateBackground(value: string) {
	backgroundColor.value = value;
	viewer?.setBackgroundColor(value);
}

function updateProgressColor(value: string) {
	progressColor.value = value;
	viewer?.setProgressColor(value);
}

function updateMinFeedColor(value: string) {
	viewer?.gcodeProcessor.updateMinFeedColor(value);
}

function updateMaxFeedColor(value: string) {
	viewer?.gcodeProcessor.updateMaxFeedColor(value);
}

function updateBedColor(value: string) {
	bedColor.value = value;
	viewer?.bed.setBedColor(value);
}

function resize() {
	if (resizeDebounce) {
		clearTimeout(resizeDebounce);
	}
	resizeDebounce = setTimeout(() => {
		if (!primaryContainer.value) return;
		const viewerHeight = Math.max(window.innerHeight - 200, 300);
		primaryContainer.value.style.height = `${viewerHeight}px`;
		viewer?.resize();
	}, 500);
}

function reset() {
	viewer?.resetCamera();
}

async function loadRunningJob() {
	if (!viewer || !job.value.file) return;
	viewer.simulation = false;
	if (selectedFile.value !== job.value.file.fileName) {
		selectedFile.value = "";
		viewer.gcodeProcessor.setLiveTracking(false);
		viewer.clearScene(true);
	}
	selectedFile.value = job.value.file.fileName;

	try {
		const blob = await machineStore.download({
			filename: job.value.file.fileName,
			type: "text",
		}, false, false, false);
		loading.value = true;
		viewer.gcodeProcessor.setLiveTracking(true);
		viewer.gcodeProcessor.updateForceWireMode(forceWireMode.value);
		viewer.gcodeProcessor.useHighQualityExtrusion(useHQRendering.value);
		preLoadSettings();
		await viewer.processFile(blob);
		if (viewGCode.value) {
			fileData.value = viewer.fileData;
		}
		scrubFileSize.value = viewer.fileSize;
		setGCodeValues();
		viewer.buildObjects.loadObjectBoundaries(job.value.build?.objects ?? []);
	} finally {
		viewer.gcodeProcessor.updateFilePosition(0);
		viewer.gcodeProcessor.forceRedraw();
		loading.value = false;
	}
}

function resetExtruderColors() {
	toolColors.value = ["#00FFFF", "#FF00FF", "#FFFF00", "#000000", "#FFFFFF"];
	updateTools();
	viewer?.gcodeProcessor.forceRedraw();
}

async function reloadviewer() {
	if (loading.value || !viewer) return;
	loading.value = true;
	preLoadSettings();
	if (viewer.fileData.length > 0) {
		await viewer.reload();
	}
	loading.value = false;

	viewer.setCursorVisiblity(showCursor.value);
	viewer.toggleTravels(showTravelLines.value);
	setGCodeValues();
	viewer.gcodeProcessor.forceRedraw();
	viewer.gcodeProcessor.updateFilePosition(scrubPosition.value);

	try {
		viewer.buildObjects.loadObjectBoundaries(job.value.build?.objects ?? []);
	} catch {
		// No build objects - benign
	}
}

function clearScene() {
	selectedFile.value = "";
	viewer?.clearScene(true);
}

async function objectDialogCancelObject() {
	objectDialogData.showDialog = false;
	const action = objectDialogData.info.cancelled ? "U" : "P";
	await machineStore.sendCode(`M486 ${action}${objectDialogData.info.index}`);
	objectDialogData.info = {} as ObjectInfo;
}

function chooseFile() {
	if (!loading.value) {
		fileInput.value?.click();
	}
}

function setGCodeValues() {
	if (!viewer) return;
	if (!g1AsExtrusion.value) {
		maxHeight.value = zBelt.value ? 500 : viewer.getMaxHeight();
		minHeight.value = viewer.getMinHeight();
	} else {
		maxHeight.value = 100000;
		minHeight.value = -100000;
	}
	sliderHeight.value = maxHeight.value;
	loading.value = false;
	maxFileFeedRate.value = viewer.gcodeProcessor.maxFeedRate;
	sliderBottomHeight.value = minHeight.value < 0 ? minHeight.value : 0;
}

function preLoadSettings() {
	if (!viewer) return;
	viewer.gcodeProcessor.updateForceWireMode(forceWireMode.value);
	viewer.gcodeProcessor.setLiveTracking(visualizingCurrentJob.value);
	viewer.gcodeProcessor.useHighQualityExtrusion(useHQRendering.value);
	viewer.gcodeProcessor.perimeterOnly = perimeterOnly.value;
	viewer.gcodeProcessor.currentWorkplace = currentWorkplace.value;
	viewer.gcodeProcessor.progressMode = progressMode.value;
	viewer.gcodeProcessor.persistTravels = persistTravels.value;
	viewer.setZBelt(zBelt.value, zBeltAngle.value);
	if (g1AsExtrusion.value) {
		renderQuality.value = 5;
		viewer.updateRenderQuality(5);
		viewer.gcodeProcessor.g1AsExtrusion = true;
		viewer.setZClipPlane(10000000, -10000000);
	}
}

async function fileSelected(e: Event) {
	const reader = new FileReader();
	reader.addEventListener("load", async (event) => {
		preLoadSettings();
		const blob = event.target!.result;
		await viewer?.processFile(blob);
		if (viewGCode.value && viewer) {
			fileData.value = viewer.fileData;
		}
		scrubFileSize.value = viewer?.fileSize ?? 0;
		setGCodeValues();
	});
	loading.value = true;
	const input = e.target as HTMLInputElement;
	if (input.files?.[0]) {
		reader.readAsText(input.files[0]);
	}
	input.value = "";
}

function toggleFullScreen() {
	fullscreen.value = !fullscreen.value;
	nextTick(() => viewer?.resize());
}

function cancelLoad() {
	if (viewer) {
		viewer.gcodeProcessor.cancelLoad = true;
	}
}

function fastForward() {
	if (!viewer) return;
	viewer.stopSimulation();
	scrubPlaying.value = false;
	scrubPosition.value = scrubFileSize.value;
	viewer.gcodeProcessor.updateFilePosition(scrubFileSize.value);
}

function updateWorkplaces() {
	if (!viewer) return;
	const axesLetterIdx: Record<string, number> = {};
	for (let i = 0; i < move.value.axes.length; i++) {
		axesLetterIdx[move.value.axes[i].letter] = i;
	}
	viewer.gcodeProcessor.workplaceOffsets = [];
	for (let idx = 0; idx < 9; idx++) {
		try {
			const x = move.value.axes[axesLetterIdx["X"]].workplaceOffsets[idx];
			const y = move.value.axes[axesLetterIdx["Y"]].workplaceOffsets[idx];
			const z = move.value.axes[axesLetterIdx["Z"]].workplaceOffsets[idx];
			viewer.gcodeProcessor.workplaceOffsets.push(new Vector3(x, y, z));
		} catch {
			// Axis not yet defined - skip this workplace slot
		}
	}
	viewer.setWorkplaceVisiblity(showWorkplace.value);
}

function updateTools() {
	if (!viewer) return;
	viewer.gcodeProcessor.resetTools();
	for (const color of toolColors.value) {
		viewer.gcodeProcessor.addTool(color, 0.4);
	}
}

// #endregion

// #region Watches
watch(move, (newValue) => {
	if (!viewer) return;
	const newPosition = newValue.axes.map((axis: Axis) => ({
		axes: axis.letter,
		position: (axis.userPosition ?? 0) + axis.workplaceOffsets[currentWorkplace.value],
	}));
	viewer.updateToolPosition(newPosition);
}, { deep: true });

watch(showCursor, (newValue) => {
	viewer?.setCursorVisiblity(newValue);
});

watch(showTravelLines, (newValue) => viewer?.toggleTravels(newValue));

watch(persistTravels, (newValue) => {
	showTravelLines.value = true;
	if (!viewer) return;
	viewer.gcodeProcessor.setTravelPersistence(newValue);
	viewer.gcodeProcessor.forceRedraw();
});

watch(visualizingCurrentJob, (newValue) => {
	if (!newValue) {
		viewer?.gcodeProcessor.doFinalPass();
	}
});

watch(filePosition, (newValue) => {
	if (visualizingCurrentJob.value) {
		scrubPosition.value = newValue;
		viewer?.gcodeProcessor.updateFilePosition(newValue + 1);
	}
});

watch(scrubSpeed, (to) => {
	if (viewer) {
		viewer.simulationMultiplier = to;
	}
});

watch(renderQuality, (newValue) => {
	if (viewer && viewer.renderQuality !== newValue) {
		viewer.updateRenderQuality(newValue);
		if (!loading.value) {
			reloadviewer();
		}
	}
});

watch(sliderHeight, (newValue) => {
	if (sliderBottomHeight.value > newValue) sliderBottomHeight.value = newValue - 1;
	if (!g1AsExtrusion.value) {
		viewer?.setZClipPlane(newValue + 1, sliderBottomHeight.value);
	}
});

watch(sliderBottomHeight, (newValue) => {
	if (sliderHeight.value < newValue) sliderHeight.value = newValue + 1;
	if (!g1AsExtrusion.value) {
		viewer?.setZClipPlane(sliderHeight.value, newValue - 1);
	}
});

watch(vertexAlpha, (newValue) => {
	if (!viewer) return;
	viewer.gcodeProcessor.setAlpha(newValue);
	reloadviewer();
});

watch(() => job.value.build?.objects, (newValue) => {
	if (viewer?.buildObjects && newValue) {
		viewer.buildObjects.loadObjectBoundaries(newValue);
	}
}, { deep: true });

watch(showObjectSelection, (newValue) => {
	if (!viewer) return;
	if (canCancelObject.value) {
		viewer.buildObjects.loadObjectBoundaries(job.value.build?.objects ?? []);
		viewer.buildObjects.showObjectSelection(newValue);
	} else {
		showObjectSelection.value = false;
		hoverLabel.value = "";
	}
});

watch(isJobRunning, (newValue) => {
	if (!viewer) return;
	viewer.gcodeProcessor.setLiveTracking(newValue);
	if (!newValue) {
		viewer.gcodeProcessor.doFinalPass();
	}
});

watch(selectedFile, () => {
	showObjectSelection.value = false;
	viewer?.gcodeProcessor.updateFilePosition(0);
});

watch(bedRenderMode, (newValue) => viewer?.bed.setRenderMode(newValue));

watch(isDelta, (newValue) => {
	viewer?.bed.setDelta(newValue);
	viewer?.resetCamera();
});

watch(showAxes, (newValue) => viewer?.axes.show(newValue));
watch(showObjectLabels, (newValue) => viewer?.buildObjects.showLabels(newValue));

watch(forceWireMode, (newValue) => {
	viewer?.gcodeProcessor.updateForceWireMode(newValue);
	reloadviewer();
});

watch(useHQRendering, (to) => viewer?.gcodeProcessor.useHighQualityExtrusion(to));

watch(colorMode, async (to) => {
	if (!viewer) return;
	viewer.gcodeProcessor.setColorMode(to);
	await reloadviewer();
});

watch(minColorRate, (to) => viewer?.gcodeProcessor.updateColorRate(to * 60, maxColorRate.value * 60));
watch(maxColorRate, (to) => viewer?.gcodeProcessor.updateColorRate(minColorRate.value * 60, to * 60));
watch(cameraInertia, (to) => viewer?.setCameraInertia(to));

watch(loading, (to) => {
	if (!to) {
		loadingProgress.value = 0;
	}
});

watch(specular, (to) => viewer?.gcodeProcessor.useSpecularColor(to));

watch(g1AsExtrusion, async (to) => {
	if (!viewer) return;
	viewer.gcodeProcessor.g1AsExtrusion = to;
	await reloadviewer();
});

watch(zBelt, (to) => viewer?.setZBelt(to, zBeltAngle.value));

watch(zBeltAngle, (to) => {
	if (to < 0 || to > 90) {
		setPluginData("GCodeViewer", PluginDataType.cache, "zBeltAngle", 45);
		return;
	}
	viewer?.setZBelt(zBelt.value, to);
});

watch(workplaceOffsets, () => updateWorkplaces(), { deep: true });
watch(currentWorkplace, (to) => {
	if (viewer) {
		viewer.gcodeProcessor.currentWorkplace = to;
	}
});
watch(showWorkplace, () => updateWorkplaces());

watch(toolColors, () => updateTools(), { deep: true });

watch(transparencyPercent, (to) => {
	if (!viewer) return;
	viewer.gcodeProcessor.setTransparencyValue(to / 100);
	viewer.gcodeProcessor.forceRedraw();
});

watch(progressMode, async () => {
	await reloadviewer();
});

// #endregion
</script>

<style scoped>
.babylon-canvas {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: black;
}

.babylon-canvas-codeview {
	position: absolute;
	top: 0;
	left: 0;
	width: 70%;
	height: 100%;
	background-color: black;
}

.codeview {
	position: absolute;
	top: 0;
	left: 70%;
	width: 30%;
	height: 100%;
}

.codeview-sm {
	position: absolute;
	top: 0;
	left: 70%;
	width: 30%;
	height: 90%;
}

.btn-toggle { flex-direction: column; }

.primary-container {
	position: relative;
	width: 100%;
	height: 100%;
}

.viewer-box {
	position: absolute;
	inset: 0;
}

.full-screen {
	position: fixed;
	inset: 0;
	z-index: 10;
}

.full-screen-icon {
	height: 40px;
	width: 40px;
}

.drawer-zindex { z-index: 20; }

.button-container {
	position: absolute;
	top: 5px;
	left: 5px;
	transition-duration: 0.3s;
}

.button-container-drawer {
	left: 355px !important;
}

/* z-index kept well below Vuetify 4's overlay stack (which starts around 1006 for menus +
   dialogs) so a popover/dialog opened over the viewer renders above the emergency button */
.emergency-button-placement {
	position: absolute;
	top: 14px;
	right: 16px;
	z-index: 5;
}

.emergency-button-placement-codeview {
	position: absolute;
	top: 14px;
	right: 30%;
	z-index: 5;
}

.loading-progress {
	position: absolute;
	width: 50%;
	left: 0;
	margin-left: 25%;
	top: 5px;
	z-index: 19;
}

.scrubber {
	position: absolute;
	left: 5%;
	right: 5%;
	bottom: 15px;
	z-index: 19;
}

.scrubber-codeview {
	position: absolute;
	left: 5%;
	right: 35%;
	bottom: 15px;
	z-index: 19;
}

.scrubber-sm {
	position: absolute;
	left: 5%;
	right: 5%;
	bottom: 70px;
	z-index: 19;
}

.scrubber-sm-codeview {
	position: absolute;
	left: 5%;
	right: 35%;
	bottom: 70px;
	z-index: 19;
}

.disable-transition {
	transition: none !important;
}

.fsoverlay {
	position: absolute;
	pointer-events: none;
	background-color: transparent;
}
</style>
