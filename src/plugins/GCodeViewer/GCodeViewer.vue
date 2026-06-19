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
	border-radius: 8px;
	overflow: hidden;
	margin: 8px;
	width: calc(100% - 16px);
}

.gcv-drawer-actions {
	padding: 12px;
}
.gcv-drawer-switches {
	padding: 0 12px 12px;
}
@media (min-width: 840px) {
	.primary-container {
		margin: 0;
		width: 100%;
	}
}

.viewer-box {
	position: absolute;
	inset: 0;
}

.full-screen {
	position: fixed;
	inset: 0;
	/* Vuetify v-app-bar sits at z-index 1008; the fullscreen viewer needs to cover it (the user
	   asked for the full screen, not "everything below the app bar") so go above that layer */
	z-index: 1100;
	background-color: black;
}

.full-screen-icon {
	height: 40px;
	width: 40px;
}

/* Settings slide-in panel + backdrop, scoped to `.viewer-box`. Above the canvas + scrubber +
   loading bar (z-indexes <=19) but below Vuetify dialogs/overlays (1006+) so a v-dialog opened
   from inside the panel still renders on top */
.gcv-settings-backdrop {
	position: absolute;
	inset: 0;
	background-color: rgba(0, 0, 0, 0.4);
	z-index: 30;
}

.gcv-settings-panel {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	width: 350px;
	max-width: 100%;
	background-color: rgb(var(--v-theme-surface));
	color: rgb(var(--v-theme-on-surface));
	z-index: 31;
	overflow-y: auto;
	box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
}

.gcv-settings-slide-enter-active,
.gcv-settings-slide-leave-active {
	transition: transform 0.25s ease;
}

.gcv-settings-slide-enter-from,
.gcv-settings-slide-leave-to {
	transform: translateX(-100%);
}

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
   dialogs) so a popover/dialog opened over the viewer renders above the emergency button.
   Pinned to the bottom-right corner so it never sits on top of Babylon's orientation gizmo at
   the top-right of the viewport */
.emergency-button-placement {
	position: absolute;
	bottom: 14px;
	right: 16px;
	z-index: 5;
}

.emergency-button-placement-codeview {
	position: absolute;
	bottom: 14px;
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

<template>
	<div ref="primaryContainer" class="primary-container">
		<!-- Teleport to body while fullscreen so the fixed overlay escapes any ancestor stacking
			 context / clipping (e.g. when embedded as a panel tab); inert on the standalone page -->
		<Teleport to="body" :disabled="!fullscreen">
		<div :class="{ 'full-screen': fullscreen }" class="viewer-box">
			<div v-if="fullscreen && settingsStore.showEmergencyStop" :class="emergencyButtonClass">
				<CodeButton :code="'M112\nM999'" :log="false" :title="$t('button.emergencyStop.title')"
							color="error" size="small">
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
					   color="primary" size="small" @click="toggleFullScreen">
					<v-icon>{{ fullscreen ? "mdi-window-restore" : "mdi-window-maximize" }}</v-icon>
				</v-btn>
				<br />
				<v-btn :title="$t('plugins.gcodeViewer.showConfiguration')" class="mb-10"
					   color="primary" size="small" @click="drawer = !drawer">
					<v-icon>mdi-cog</v-icon>
				</v-btn>
				<br />
				<v-btn v-if="isJobRunning && !loading && !followingJob"
					   :title="$t('plugins.gcodeViewer.loadCurrentJob.title')" class="mb-10"
					   color="primary" size="small" @click="() => loadRunningJob(true)">
					<v-icon>mdi-printer-3d</v-icon>
				</v-btn>
				<br />
				<v-btn v-if="loading" :title="$t('plugins.gcodeViewer.cancelLoad')"
					   color="warning" size="small" @click="cancelLoad">
					<v-icon color="error">mdi-cancel</v-icon>
				</v-btn>
			</div>

			<!-- Settings panel: plain absolutely-positioned child of `.viewer-box` rather than a
				 v-navigation-drawer, because the drawer's teleport + overlay layer fights the
				 in-component containment we need. Normal mode: viewer-box is
				 `position: absolute; inset: 0` so the panel stays within the viewer card and
				 doesn't bleed over the status panel above. Fullscreen mode: viewer-box becomes
				 `position: fixed; inset: 0` and the panel covers the viewport with it -->
			<div v-if="drawer" class="gcv-settings-backdrop" @click="drawer = false" />
			<Transition name="gcv-settings-slide">
				<aside v-if="drawer" class="gcv-settings-panel">
					<v-expansion-panels v-model="openDrawerPanel" variant="accordion">
					<v-expansion-panel value="view">
						<v-expansion-panel-title :title="$t('plugins.gcodeViewer.viewActions.title')">
							<v-icon class="mr-2">mdi-eye</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.viewActions.caption") }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text eager>
							<div class="d-flex flex-column ga-2">
								<v-btn :title="$t('plugins.gcodeViewer.resetCamera.title')" block color="primary"
									   prepend-icon="mdi-camera" @click="reset">
									{{ $t("plugins.gcodeViewer.resetCamera.caption") }}
								</v-btn>
								<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.reloadView.title')" block
									   color="primary" prepend-icon="mdi-reload-alert" @click="reloadviewer">
									{{ $t("plugins.gcodeViewer.reloadView.caption") }}
								</v-btn>
								<v-btn :disabled="!isJobRunning || loading || followingJob"
									   :title="$t('plugins.gcodeViewer.loadCurrentJob.title')" block
									   color="secondary" prepend-icon="mdi-printer-3d" @click="() => loadRunningJob(true)">
									{{ $t("plugins.gcodeViewer.loadCurrentJob.caption") }}
								</v-btn>
								<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.unloadGCode.title')" block
									   color="primary" prepend-icon="mdi-video-3d-off" @click="clearScene">
									{{ $t("plugins.gcodeViewer.unloadGCode.caption") }}
								</v-btn>
								<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.loadLocalGCode.title')" block
									   color="primary" prepend-icon="mdi-file" @click="chooseFile">
									{{ $t("plugins.gcodeViewer.loadLocalGCode.caption") }}
								</v-btn>
								<input ref="fileInput" type="file" accept=".g,.gcode,.gc,.gco,.nc,.ngc,.tap" hidden multiple
									   @change="fileSelected" />

								<v-divider class="my-1" />

								<div class="d-flex flex-column">
									<v-switch v-model="showObjectSelection" :disabled="!canCancelObject"
											  :label="jobSelectionLabel" color="primary" hide-details />
									<v-switch v-model="showCursor" :label="$t('plugins.gcodeViewer.showCursor')"
											  color="primary" hide-details />
									<v-switch v-model="showTravelLines" :label="$t('plugins.gcodeViewer.showTravels')"
											  color="primary" hide-details />
									<v-switch v-model="persistTravels" :label="$t('plugins.gcodeViewer.persistTravels')"
											  color="primary" hide-details />
									<v-switch v-model="viewGCode" :label="$t('plugins.gcodeViewer.viewGCode')"
											  color="primary" hide-details />
								</div>
							</div>
						</v-expansion-panel-text>
					</v-expansion-panel>

					<v-expansion-panel value="quality">
						<v-expansion-panel-title :title="$t('plugins.gcodeViewer.renderQuality.title')">
							<v-icon class="mr-2">mdi-checkerboard</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.renderQuality.caption") }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text eager>
							<div class="d-flex flex-column ga-3">
								<v-select v-model="renderQuality" :items="renderQualityItems"
										  :label="$t('plugins.gcodeViewer.renderQuality.caption')"
										  :disabled="loading" density="compact" variant="outlined"
										  hide-details />
								<div class="d-flex flex-column">
									<v-checkbox v-model="useHQRendering" :label="$t('plugins.gcodeViewer.useHQRendering')"
												color="primary" hide-details />
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
								</div>
							</div>
						</v-expansion-panel-text>
					</v-expansion-panel>

					<v-expansion-panel>
						<v-expansion-panel-title :title="$t('plugins.gcodeViewer.extruders.title')">
							<v-icon class="mr-2">mdi-printer-3d-nozzle</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.extruders.caption") }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text>
							<div class="d-flex flex-column ga-3">
								<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.reloadView.title')" block
									   color="primary" @click="reloadviewer">
									{{ $t("plugins.gcodeViewer.reloadView.caption") }}
								</v-btn>
								<div v-for="(extruder, index) in toolColors" :key="index">
									<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.tool", [index]) }}</div>
									<ColorPicker :editcolor="extruder"
												 @updatecolor="(value) => updateColor(index, value)" />
								</div>
								<v-btn block color="warning" @click="resetExtruderColors">
									{{ $t("plugins.gcodeViewer.resetColor", toolColors.length) }}
								</v-btn>
							</div>
						</v-expansion-panel-text>
					</v-expansion-panel>

					<v-expansion-panel>
						<v-expansion-panel-title :title="$t('plugins.gcodeViewer.renderMode.title')">
							<v-icon class="mr-2">mdi-palette</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.renderMode.caption", 2) }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text>
							<div class="d-flex flex-column ga-3">
								<v-btn-toggle v-model="colorMode" mandatory class="btn-toggle d-flex">
									<v-btn :disabled="loading" :value="0" block>{{ $t("plugins.gcodeViewer.color") }}</v-btn>
									<v-btn :disabled="loading" :value="1" block>{{ $t("plugins.gcodeViewer.feedrate") }}</v-btn>
									<v-btn :disabled="loading" :value="2" block>{{ $t("plugins.gcodeViewer.feature") }}</v-btn>
								</v-btn-toggle>
								<v-checkbox v-model="g1AsExtrusion" :label="$t('plugins.gcodeViewer.g1AsExtrusion')"
											color="primary" hide-details />
								<div>
									<div class="text-title-small mb-1">{{ $t("plugins.gcodeViewer.minFeedrate") }}</div>
									<v-slider v-model="minColorRate" :max="500" :min="5" thumb-label hide-details />
								</div>
								<div>
									<div class="text-title-small mb-1">{{ $t("plugins.gcodeViewer.maxFeedrate") }}</div>
									<v-slider v-model="maxColorRate" :max="500" :min="5" thumb-label hide-details />
								</div>
								<div>
									<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.minFeedrateColor") }}</div>
									<ColorPicker :editcolor="minFeedColor"
												 @updatecolor="(value) => updateMinFeedColor(value)" />
								</div>
								<div>
									<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.maxFeedrateColor") }}</div>
									<ColorPicker :editcolor="maxFeedColor"
												 @updatecolor="(value) => updateMaxFeedColor(value)" />
								</div>
								<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.reloadView.title')" block
									   color="primary" @click="reloadviewer">
									{{ $t("plugins.gcodeViewer.reloadView.caption") }}
								</v-btn>
							</div>
						</v-expansion-panel-text>
					</v-expansion-panel>

					<v-expansion-panel>
						<v-expansion-panel-title :title="$t('plugins.gcodeViewer.progress.title')">
							<v-icon class="mr-2">mdi-progress-clock</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.progress.caption") }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text>
							<div class="d-flex flex-column ga-3">
								<div>
									<div class="text-title-small mb-1">{{ $t("plugins.gcodeViewer.topClipping") }}</div>
									<v-slider v-model="sliderHeight" :max="maxHeight" :min="minHeight" step="0.1"
											  thumb-label hide-details />
								</div>
								<div>
									<div class="text-title-small mb-1">{{ $t("plugins.gcodeViewer.bottomClipping") }}</div>
									<v-slider v-model="sliderBottomHeight" :max="maxHeight" :min="minHeight" step="0.1"
											  thumb-label hide-details />
								</div>
								<div>
									<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.progressColor") }}</div>
									<ColorPicker :editcolor="progressColor"
												 @updatecolor="(value) => updateProgressColor(value)" />
								</div>
							</div>
						</v-expansion-panel-text>
					</v-expansion-panel>

					<v-expansion-panel>
						<v-expansion-panel-title>
							<v-icon class="mr-2">mdi-cog</v-icon>
							<strong>{{ $t("plugins.gcodeViewer.settings") }}</strong>
						</v-expansion-panel-title>
						<v-expansion-panel-text>
							<div class="d-flex flex-column ga-3">
								<div>
									<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.background") }}</div>
									<ColorPicker :editcolor="backgroundColor"
												 @updatecolor="(value) => updateBackground(value)" />
								</div>
								<div>
									<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.bedRenderMode") }}</div>
									<v-btn-toggle v-model="bedRenderMode" mandatory class="d-flex flex-column mb-3">
										<v-btn :value="0" block>{{ $t("plugins.gcodeViewer.bed") }}</v-btn>
										<v-btn :value="1" block>{{ $t("plugins.gcodeViewer.volume") }}</v-btn>
									</v-btn-toggle>
									<ColorPicker :editcolor="bedColor"
												 @updatecolor="(value) => updateBedColor(value)" />
								</div>
								<div class="d-flex flex-column">
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
								</div>
								<v-text-field v-model.number="zBeltAngle" type="number"
											  :label="$t('plugins.gcodeViewer.zBeltAngle')"
											  density="compact" variant="outlined" hide-details />
							</div>
						</v-expansion-panel-text>
					</v-expansion-panel>
					</v-expansion-panels>
				</aside>
			</Transition>

			<div v-show="!followingJob && scrubFileSize > 0"
				 :class="[{ 'button-container-drawer': drawer }, scrubberClass]">
				<v-row class="scrubber-row">
					<v-col cols="10" md="5">
						<v-slider v-model="scrubPosition" :hint="`${scrubPosition}/${scrubFileSize}`"
								  :max="scrubFileSize" min="0" density="compact" persistent-hint hide-details
								  @update:model-value="scrubPositionChanged" />
					</v-col>
					<v-col cols="2">
						<v-row density="compact">
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
					<v-col cols="12" md="5">
						<v-btn-toggle v-model="scrubSpeed" mandatory rounded color="secondary" class="w-100">
							<v-btn :value="1" class="flex-grow-1">1x</v-btn>
							<v-btn :value="2" class="flex-grow-1">2x</v-btn>
							<v-btn :value="5" class="flex-grow-1">5x</v-btn>
							<v-btn :value="10" class="flex-grow-1">10x</v-btn>
							<v-btn :value="20" class="flex-grow-1">20x</v-btn>
							<v-btn :value="100" class="flex-grow-1">100x</v-btn>
						</v-btn-toggle>
					</v-col>
				</v-row>
			</div>
		</div>
		</Teleport>

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
import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import { isPrinting } from "@/utils/enums";
import Path from "@/utils/path";

import CodeStream from "./CodeStream.vue";
import ColorPicker from "./ColorPicker.vue";
import FSOverlay from "./FSOverlay.vue";

interface ObjectInfo {
	cancelled: boolean;
	index: number;
	name?: string;
}

interface PrintBounds {
	min: Vector3;
	max: Vector3;
}

const machineStore = useMachineStore();
const cacheStore = useCacheStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();
const display = useDisplay();
const route = useRoute();

// The standalone page lives under /Plugins/GCodeViewer and sizes itself to the viewport; rendered
// anywhere else (e.g. as a tab in the Job Status view panel) it fills its container instead
const isEmbedded = computed(() => !route.path.startsWith("/Plugins/GCodeViewer"));

// Intentionally module-scope (not a ref) - Babylon's internals don't survive Vue's reactive
// proxy walk; the template never reads `viewer` directly so losing reactivity is safe
let viewer: any = null;

const primaryContainer = ref<HTMLElement | null>(null);
const viewerCanvas = ref<HTMLCanvasElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const drawer = ref(false);
// Open the View / Actions group by default when the drawer first comes up - it carries the
// reset/reload/load buttons + the toggles a user most often reaches for
const openDrawerPanel = ref<string>("view");

const renderQualityItems = computed(() => [
	{ title: i18n.global.t("plugins.gcodeViewer.sbc"),    value: 1 },
	{ title: i18n.global.t("plugins.gcodeViewer.low"),    value: 2 },
	{ title: i18n.global.t("plugins.gcodeViewer.medium"), value: 3 },
	{ title: i18n.global.t("plugins.gcodeViewer.high"),   value: 4 },
	{ title: i18n.global.t("plugins.gcodeViewer.ultra"),  value: 5 },
	{ title: i18n.global.t("plugins.gcodeViewer.max"),    value: 6 },
]);
const backgroundColor = ref("#000000FF");
const progressColor = ref("#FFFFFFFF");
const loading = ref(false);
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

// True only while the viewer actively follows the running print head (live tracking). The Job
// Status tab turns this on automatically; the standalone page leaves it off and renders the whole
// file as finished, so the user can scrub it - they opt into live view via the "load current job"
// button, which also re-enables per-object cancellation
const followingJob = ref(false);

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
		return followingJob.value;
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
	set: (value) => cacheStore.setPluginData("GCodeViewer", "toolColors", value),
});

const useHQRendering = computed<boolean>({
	get: () => pluginCache.value?.useHQRendering ?? false,
	set: (value) => cacheStore.setPluginData("GCodeViewer", "useHQRendering", value),
});

const specular = computed<boolean>({
	get: () => pluginCache.value?.useSpecular ?? true,
	set: (value) => cacheStore.setPluginData("GCodeViewer", "useSpecular", value),
});

const g1AsExtrusion = computed<boolean>({
	get: () => pluginCache.value?.g1AsExtrusion ?? false,
	set: (value) => cacheStore.setPluginData("GCodeViewer", "g1AsExtrusion", value),
});

const viewGCode = computed<boolean>({
	get: () => pluginCache.value?.viewGCode ?? false,
	set: (value) => {
		cacheStore.setPluginData("GCodeViewer", "viewGCode", value);
		if (viewer) {
			fileData.value = value ? viewer.fileData : "";
		}
		resize();
	},
});

const zBelt = computed<boolean>({
	get: () => pluginCache.value?.zBelt ?? false,
	set: (value) => cacheStore.setPluginData("GCodeViewer", "zBelt", value),
});

const zBeltAngle = computed<number>({
	get: () => pluginCache.value?.zBeltAngle ?? 45,
	set: (value) => cacheStore.setPluginData("GCodeViewer", "zBeltAngle", value),
});

const showWorkplace = computed<boolean>({
	get: () => pluginCache.value?.showWorkplace ?? true,
	set: (value) => cacheStore.setPluginData("GCodeViewer", "showWorkplace", value),
});

const showCursor = computed<boolean>({
	get: () => pluginCache.value?.showCursor ?? false,
	set: (value) => cacheStore.setPluginData("GCodeViewer", "showCursor", value),
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
	return move.value.motionSystems[machineStore.selectedMotionSystem]?.workplaceNumber ?? 0;
});

// #endregion

// #region Viewer lifecycle
async function loadSdFile(path: string) {
	selectedFile.value = path;
	followingJob.value = false;
	if (!viewer) {
		return;
	}
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
		viewer.gcodeProcessor.setLiveTracking(false);
		setGCodeValues();
		applyDefaultOrientation();
	} finally {
		loading.value = false;
	}
}

// Resolve the SD-card file path from the route's `:volume?/:path(.*)?` params. Empty when the
// page was opened at its bare path with no file to preview
function sdPathFromRoute(): string {
	const params = route.params as Record<string, string | string[] | undefined>;
	const rawVolume = Array.isArray(params.volume) ? params.volume[0] : params.volume;
	const rawPath = Array.isArray(params.path) ? params.path.join("/") : params.path;
	const filePath = rawPath ?? "";
	if (filePath === "") {
		return "";
	}
	const volume = rawVolume && /^\d+$/.test(rawVolume) ? rawVolume : "0";
	return `${volume}:/${filePath}`;
}

// Load whatever the route asks for: a deep-linked file, or - at the bare path - the running job
function loadFromRoute() {
	const filePath = sdPathFromRoute();
	if (filePath) {
		if (filePath !== selectedFile.value) {
			loadSdFile(filePath);
		}
	} else {
		autoLoadRunningJob();
	}
}

// Default camera placement: a front view tilted 45 deg down. For an ArcRotateCamera alpha -PI/2
// faces the front edge and beta PI/4 is the tilt. The look-at point and orbit radius frame the
// printed geometry when a file is loaded, falling back to the whole bed when it isn't
function applyDefaultOrientation() {
	const camera = viewer?.scene?.activeCamera;
	if (!camera) {
		return;
	}
	const bounds = getPrintBounds();
	if (bounds) {
		camera.target = new Vector3((bounds.min.x + bounds.max.x) / 2, (bounds.min.y + bounds.max.y) / 2,
			(bounds.min.z + bounds.max.z) / 2);
	} else {
		const center = viewer.bed.getCenter();
		camera.target = new Vector3(center.x, -2, center.y);
	}
	camera.alpha = -Math.PI / 2;
	camera.beta = Math.PI / 4;
	frameToViewport(framingCorners(bounds));
	viewer.scene.render(true);
}

// Axis-aligned bounding box of every extruding move in the loaded file, in Babylon space (x = X,
// y = print height, z = Y). Returns null when nothing extruding has been parsed yet, so callers
// fall back to framing the bed. Walked once per load / reset (never per frame), so the linear scan
// over all rendered segments is cheap relative to the parse that just produced them
function getPrintBounds(): PrintBounds | null {
	const lines = viewer?.gcodeProcessor?.renderedLines as
		Array<{ start: Vector3; end: Vector3; extruding: boolean }> | undefined;
	if (!lines || lines.length === 0) {
		return null;
	}
	let minX = Infinity, minY = Infinity, minZ = Infinity;
	let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
	for (const line of lines) {
		if (!line.extruding) {
			continue;
		}
		minX = Math.min(minX, line.start.x, line.end.x); maxX = Math.max(maxX, line.start.x, line.end.x);
		minY = Math.min(minY, line.start.y, line.end.y); maxY = Math.max(maxY, line.start.y, line.end.y);
		minZ = Math.min(minZ, line.start.z, line.end.z); maxZ = Math.max(maxZ, line.start.z, line.end.z);
	}
	if (!Number.isFinite(minX)) {
		return null;
	}
	return { min: new Vector3(minX, minY, minZ), max: new Vector3(maxX, maxY, maxZ) };
}

// Corners fed to the framing fit: the eight corners of the print bounding box, or - with nothing
// loaded - the four bed-footprint corners on the bed plane. All in Babylon space (y is height)
function framingCorners(bounds: PrintBounds | null): Array<[number, number, number]> {
	if (bounds) {
		const lo = bounds.min, hi = bounds.max;
		return [
			[lo.x, lo.y, lo.z], [hi.x, lo.y, lo.z], [lo.x, lo.y, hi.z], [hi.x, lo.y, hi.z],
			[lo.x, hi.y, lo.z], [hi.x, hi.y, lo.z], [lo.x, hi.y, hi.z], [hi.x, hi.y, hi.z],
		];
	}
	const center = viewer.bed.getCenter();
	const size = viewer.bed.getSize();
	const hx = size.x / 2, hy = size.y / 2;
	return [
		[center.x - hx, -2, center.y - hy], [center.x + hx, -2, center.y - hy],
		[center.x - hx, -2, center.y + hy], [center.x + hx, -2, center.y + hy],
	];
}

// Pull the orbit camera back until the supplied bounding-box corners fill the viewport. Each corner
// is projected with the live view + projection matrices and the radius is rescaled from how much of
// the clip volume they span, so the fit adapts to the box size, the camera tilt and the viewport
// aspect ratio. A strip is reserved at the bottom so the playback controls stay clear. Perspective
// makes a single pass approximate, hence the short converging loops
function frameToViewport(corners: Array<[number, number, number]>) {
	const camera = viewer?.scene?.activeCamera;
	if (!camera || corners.length === 0) {
		return;
	}

	let spanMinX = Infinity, spanMaxX = -Infinity;
	let spanMinY = Infinity, spanMaxY = -Infinity;
	let spanMinZ = Infinity, spanMaxZ = -Infinity;
	for (const [x, y, z] of corners) {
		spanMinX = Math.min(spanMinX, x); spanMaxX = Math.max(spanMaxX, x);
		spanMinY = Math.min(spanMinY, y); spanMaxY = Math.max(spanMaxY, y);
		spanMinZ = Math.min(spanMinZ, z); spanMaxZ = Math.max(spanMaxZ, z);
	}
	const maxSpan = Math.max(spanMaxX - spanMinX, spanMaxY - spanMinY, spanMaxZ - spanMinZ, 1);

	// Before the canvas has a real size the projection matrix is degenerate; fall back to a
	// rough radius and let the next call (after layout / a file load) frame it properly
	const engine = viewer.scene.getEngine();
	if (engine.getRenderWidth() < 1 || engine.getRenderHeight() < 1) {
		camera.radius = 2 * maxSpan;
		return;
	}

	// Start far enough back that every corner is in front of the camera on the first pass
	camera.radius = 2 * maxSpan;

	// Zoom so the box fills 95% of the viewport width or 74% of its height, whichever binds
	// first - the rest stays as breathing room
	const targetX = 0.95;
	const targetY = 0.74;
	for (let pass = 0; pass < 8; pass++) {
		const view = camera.getViewMatrix(true).m as Float32Array;
		const proj = camera.getProjectionMatrix(true).m as Float32Array;
		let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, behind = false;
		for (const [x, y, z] of corners) {
			// World -> view space (the view matrix is affine, so w stays 1)
			const vx = view[0] * x + view[4] * y + view[8] * z + view[12];
			const vy = view[1] * x + view[5] * y + view[9] * z + view[13];
			const vz = view[2] * x + view[6] * y + view[10] * z + view[14];
			// View -> clip space
			const cw = proj[3] * vx + proj[7] * vy + proj[11] * vz + proj[15];
			if (cw <= 0) {
				behind = true;
				break;
			}
			const ndcX = (proj[0] * vx + proj[4] * vy + proj[8] * vz + proj[12]) / cw;
			const ndcY = (proj[1] * vx + proj[5] * vy + proj[9] * vz + proj[13]) / cw;
			minX = Math.min(minX, ndcX); maxX = Math.max(maxX, ndcX);
			minY = Math.min(minY, ndcY); maxY = Math.max(maxY, ndcY);
		}
		if (behind || !Number.isFinite(minX)) {
			camera.radius *= 2;
			continue;
		}
		// The visible clip range is [-1, 1] on each axis. Rescale by whichever axis overshoots
		// its target fill fraction the most
		const xFill = (maxX - minX) / 2;
		const yFill = (maxY - minY) / 2;
		if (xFill <= 0 && yFill <= 0) {
			break;
		}
		const nextRadius = camera.radius * Math.max(xFill / targetX, yFill / targetY);
		const converged = Math.abs(nextRadius - camera.radius) < camera.radius * 0.01;
		camera.radius = nextRadius;
		if (converged) {
			break;
		}
	}

	// Centre the box vertically between the top of the playback controls overlay and the top of
	// the viewport - clip-space y +0.1 is the midpoint of that band. Perspective skews the
	// projected box, so the look-at point is nudged until the box centre lands; damped empirical
	// steps converge without depending on the exact FOV
	const desiredCenter = 0.1;
	for (let pass = 0; pass < 6; pass++) {
		const view = camera.getViewMatrix(true).m as Float32Array;
		const proj = camera.getProjectionMatrix(true).m as Float32Array;
		let minY = Infinity, maxY = -Infinity;
		for (const [x, y, z] of corners) {
			const vx = view[0] * x + view[4] * y + view[8] * z + view[12];
			const vy = view[1] * x + view[5] * y + view[9] * z + view[13];
			const vz = view[2] * x + view[6] * y + view[10] * z + view[14];
			const cw = proj[3] * vx + proj[7] * vy + proj[11] * vz + proj[15];
			if (cw <= 0) {
				continue;
			}
			const ndcY = (proj[1] * vx + proj[5] * vy + proj[9] * vz + proj[13]) / cw;
			minY = Math.min(minY, ndcY);
			maxY = Math.max(maxY, ndcY);
		}
		if (!Number.isFinite(minY)) {
			break;
		}
		const deltaNdc = desiredCenter - (minY + maxY) / 2;
		if (Math.abs(deltaNdc) < 0.01) {
			break;
		}
		// Lowering the target lifts the scene; ~0.6 radius per NDC unit lands close and the
		// loop mops up the rest
		const t = camera.target;
		camera.target = new Vector3(t.x, t.y - deltaNdc * 0.6 * camera.radius, t.z);
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
	if (!viewerCanvas.value) {
		return;
	}
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

	nextTick(() => {
		updateTools();
		updateWorkplaces();
	});

	window.addEventListener("keyup", onKeyUp);
	window.addEventListener("resize", onWindowResize);

	applyDefaultOrientation();

	// A file deep-linked into the route (Jobs list "View 3D" navigation arrives this way) loads
	// immediately; at the bare path the viewer falls back to the running job instead
	loadFromRoute();
});

// Re-entering the kept-alive page, or navigating to a different file while it stays mounted,
// re-resolves what the route asks for
onActivated(() => {
	loadFromRoute();
});
watch(sdPathFromRoute, loadFromRoute);

onBeforeUnmount(() => {
	window.removeEventListener("keyup", onKeyUp);
	window.removeEventListener("resize", onWindowResize);
	if (colorDebounce) {
		clearTimeout(colorDebounce);
	}
	if (resizeDebounce) {
		clearTimeout(resizeDebounce);
	}
	viewer = null;
});

// #endregion

// #region Methods
function simulatePlay() {
	if (!viewer) {
		return;
	}
	if (scrubPlaying.value) {
		viewer.stopSimulation();
	} else {
		viewer.startSimulation();
	}
	scrubPlaying.value = viewer.simulation;
}

function scrubPositionChanged(value: number) {
	if (!viewer) {
		return;
	}
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
	if (!viewer) {
		return;
	}
	const next = toolColors.value.slice();
	next[index] = value;
	viewer.gcodeProcessor.updateTool(value, 0.4, index);
	if (colorDebounce) {
		clearTimeout(colorDebounce);
	}
	colorDebounce = setTimeout(() => {
		cacheStore.setPluginData("GCodeViewer", "toolColors", next);
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
		if (!primaryContainer.value) {
			return;
		}
		// On the standalone page the container has no bounded height of its own, so size it to the
		// viewport minus the appbar + container padding (floored so a cramped window stays usable).
		// xs/sm: layout strips its outer padding, but the viewer adds an 8px breathing margin
		// (top + bottom = 16) on top of the appbar. md+ uses the layout's 16px top/bottom
		// padding (32) and the viewer sits flush with that frame. Embedded, the host panel bounds
		// the height, so leave the CSS height: 100% in charge and only resync the canvas
		if (!isEmbedded.value) {
			const mainElement = document.querySelector(".v-main");
			const appBarHeight = mainElement
				? parseInt(getComputedStyle(mainElement).getPropertyValue("--v-layout-top")) || 64
				: 64;
			const chrome = appBarHeight + (display.mdAndUp.value ? 32 : 16);
			const viewerHeight = Math.max(window.innerHeight - chrome, 400);
			primaryContainer.value.style.height = `${viewerHeight}px`;
		}
		viewer?.resize();
	}, 500);
}

function reset() {
	applyDefaultOrientation();
}

// Loads the job currently being processed, but only when the viewer is idle and empty - an
// explicit file selection or an in-progress load is left untouched. The embedded Job Status tab
// follows the live print head; the standalone page renders the whole file as finished instead
function autoLoadRunningJob() {
	if (isJobRunning.value && !loading.value && !visualizingCurrentJob.value && selectedFile.value === "") {
		loadRunningJob(isEmbedded.value);
	}
}

async function loadRunningJob(live = true) {
	if (!viewer || !job.value.file) {
		return;
	}
	viewer.simulation = false;
	if (selectedFile.value !== job.value.file.fileName) {
		selectedFile.value = "";
		viewer.gcodeProcessor.setLiveTracking(false);
		viewer.clearScene(true);
	}
	selectedFile.value = job.value.file.fileName;
	followingJob.value = live;

	try {
		const blob = await machineStore.download({
			filename: job.value.file.fileName,
			type: "text",
		}, false, false, false);
		loading.value = true;
		viewer.gcodeProcessor.setLiveTracking(live);
		viewer.gcodeProcessor.updateForceWireMode(forceWireMode.value);
		viewer.gcodeProcessor.useHighQualityExtrusion(useHQRendering.value);
		preLoadSettings();
		await viewer.processFile(blob);
		if (viewGCode.value) {
			fileData.value = viewer.fileData;
		}
		scrubFileSize.value = viewer.fileSize;
		setGCodeValues();
		applyDefaultOrientation();
		viewer.buildObjects.loadObjectBoundaries(job.value.build?.objects ?? []);
	} finally {
		if (live) {
			viewer.gcodeProcessor.updateFilePosition(0);
		} else {
			viewer.gcodeProcessor.doFinalPass();
		}
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
	if (loading.value || !viewer) {
		return;
	}
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

// Reveal the whole file once live tracking ends. doFinalPass() only flips the processor's internal
// flag - it never pushes the file position to the render instances, which clip geometry purely by
// their last currentFilePosition. When a job ends the object model can reset job.filePosition to 0
// in a patch that arrives while followingJob is still true, clipping the finished print away to
// nothing; pushing the end position back in restores it
function showCompletedPrint() {
	if (!viewer) {
		return;
	}
	viewer.gcodeProcessor.updateFilePosition(Number.MAX_VALUE);
	viewer.gcodeProcessor.doFinalPass();
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
	if (!viewer) {
		return;
	}
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
	if (!viewer) {
		return;
	}
	viewer.gcodeProcessor.updateForceWireMode(forceWireMode.value);
	viewer.gcodeProcessor.setLiveTracking(followingJob.value);
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
		applyDefaultOrientation();
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
	if (!viewer) {
		return;
	}
	viewer.stopSimulation();
	scrubPlaying.value = false;
	scrubPosition.value = scrubFileSize.value;
	viewer.gcodeProcessor.updateFilePosition(scrubFileSize.value);
}

function updateWorkplaces() {
	if (!viewer) {
		return;
	}
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
	if (!viewer) {
		return;
	}
	viewer.gcodeProcessor.resetTools();
	for (const color of toolColors.value) {
		viewer.gcodeProcessor.addTool(color, 0.4);
	}
}

// #endregion

// #region Watches
watch(move, (newValue) => {
	if (!viewer) {
		return;
	}
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
	if (!viewer) {
		return;
	}
	viewer.gcodeProcessor.setTravelPersistence(newValue);
	viewer.gcodeProcessor.forceRedraw();
});

watch(visualizingCurrentJob, (newValue) => {
	if (!newValue) {
		followingJob.value = false;
		showCompletedPrint();
	}
});

watch(filePosition, (newValue) => {
	if (followingJob.value) {
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
	if (sliderBottomHeight.value > newValue) {
		sliderBottomHeight.value = newValue - 1;
	}
	if (!g1AsExtrusion.value) {
		viewer?.setZClipPlane(newValue + 1, sliderBottomHeight.value);
	}
});

watch(sliderBottomHeight, (newValue) => {
	if (sliderHeight.value < newValue) {
		sliderHeight.value = newValue + 1;
	}
	if (!g1AsExtrusion.value) {
		viewer?.setZClipPlane(sliderHeight.value, newValue - 1);
	}
});

watch(vertexAlpha, (newValue) => {
	if (!viewer) {
		return;
	}
	viewer.gcodeProcessor.setAlpha(newValue);
	reloadviewer();
});

watch(() => job.value.build?.objects, (newValue) => {
	if (viewer?.buildObjects && newValue) {
		viewer.buildObjects.loadObjectBoundaries(newValue);
	}
}, { deep: true });

watch(showObjectSelection, (newValue) => {
	if (!viewer) {
		return;
	}
	if (canCancelObject.value) {
		viewer.buildObjects.loadObjectBoundaries(job.value.build?.objects ?? []);
		viewer.buildObjects.showObjectSelection(newValue);
	} else {
		showObjectSelection.value = false;
		hoverLabel.value = "";
	}
});

watch(isJobRunning, (newValue) => {
	if (!viewer) {
		return;
	}
	if (!newValue) {
		followingJob.value = false;
		showCompletedPrint();
	}
	viewer.gcodeProcessor.setLiveTracking(followingJob.value);
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
	if (!viewer) {
		return;
	}
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
	if (!viewer) {
		return;
	}
	viewer.gcodeProcessor.g1AsExtrusion = to;
	await reloadviewer();
});

watch(zBelt, (to) => viewer?.setZBelt(to, zBeltAngle.value));

watch(zBeltAngle, (to) => {
	if (to < 0 || to > 90) {
		cacheStore.setPluginData("GCodeViewer", "zBeltAngle", 45);
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
	if (!viewer) {
		return;
	}
	viewer.gcodeProcessor.setTransparencyValue(to / 100);
	viewer.gcodeProcessor.forceRedraw();
});

watch(progressMode, async () => {
	await reloadviewer();
});

// #endregion
</script>
