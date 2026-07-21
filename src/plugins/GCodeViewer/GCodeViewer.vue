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

.primary-container {
	position: relative;
	width: 100%;
	height: 100%;
	border-radius: 8px;
	overflow: hidden;
	margin: 8px;
	width: calc(100% - 16px);
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

.gcv-icon-btn {
	height: 40px;
	min-width: 40px;
	padding: 0 8px;
}

/* max-width rather than width so the caption can animate in - `width: auto` is not interpolatable */
.gcv-btn-label {
	max-width: 0;
	overflow: hidden;
	white-space: nowrap;
	transition: max-width 0.2s ease, margin 0.2s ease;
}

.gcv-icon-btn:hover .gcv-btn-label,
.gcv-icon-btn:focus-visible .gcv-btn-label {
	max-width: 200px;
	margin-left: 6px;
}

.gcv-icon-btn:hover .gcv-btn-label-left,
.gcv-icon-btn:focus-visible .gcv-btn-label-left {
	margin-left: 0;
	margin-right: 6px;
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
	display: flex;
	flex-direction: column;
	box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
}

.gcv-settings-header {
	padding: 8px 8px 8px 16px;
}

/* 16px, not 12px: a v-slider thumb parked at its maximum puts its 42px touch target 13px past the
   slider's own box. The padding absorbs most of it, and overflow-x settles the rest - the panel has
   a fixed width and nothing in it is ever meant to scroll sideways */
.gcv-settings-body {
	padding: 16px;
	overflow-x: hidden;
	overflow-y: auto;
}

.gcv-settings-slide-enter-active,
.gcv-settings-slide-leave-active {
	transition: transform 0.25s ease;
}

.gcv-settings-slide-enter-from,
.gcv-settings-slide-leave-to {
	transform: translateX(-100%);
}

/* The three left-hand button groups sit above the settings panel and its backdrop so a category
   can be switched or closed without going through the backdrop first */
.button-container,
.gcv-category-container,
.gcv-settings-container {
	position: absolute;
	left: 5px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 5px;
	z-index: 32;
	transition-duration: 0.3s;
}

.button-container {
	top: 5px;
}

.gcv-category-container {
	top: 50%;
	transform: translateY(-50%);
}

.gcv-settings-container {
	bottom: 5px;
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
	bottom: 5px;
	right: 5px;
	z-index: 5;
}

.emergency-button-placement-codeview {
	position: absolute;
	bottom: 5px;
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
							class="gcv-icon-btn" color="error" size="small">
					<span class="gcv-btn-label gcv-btn-label-left">{{ $t("button.emergencyStop.caption") }}</span>
					<v-icon>mdi-flash</v-icon>
				</CodeButton>
			</div>

			<CodeStream v-if="!isEmbedded" :shown="viewGCode" :is-simulating="scrubPlaying" :document="fileData"
						:class="codeViewClass" :currentline="scrubPosition" @changed="scrubPositionChanged" />

			<canvas ref="viewerCanvas" :title="hoverLabel" :class="viewerClass" />

			<FSOverlay v-show="fullscreen && showOverlay" :class="[viewerClass, 'fsoverlay']"
					   :viewgcode="viewGCode" />

			<!-- Indeterminate: the WASM parse is one synchronous call in the worker, so it can't
				 report incremental progress mid-parse - a determinate bar would just jump 0 -> 100 -->
			<div class="loading-progress">
				<v-progress-linear v-show="loading" indeterminate height="24" rounded>
					{{ loadingMessage }}
				</v-progress-linear>
			</div>

			<div :class="{ 'button-container-drawer': drawer }" class="button-container">
				<v-btn class="gcv-icon-btn" color="primary" size="small" @click="toggleFullScreen">
					<v-icon>{{ fullscreen ? "mdi-window-restore" : "mdi-window-maximize" }}</v-icon>
					<span class="gcv-btn-label">{{ $t("plugins.gcodeViewer.fullscreen") }}</span>
				</v-btn>
				<v-btn v-if="canToggleLiveView" class="gcv-icon-btn" color="primary" size="small"
					   :title="followingJob ? $t('plugins.gcodeViewer.staticView.title') : $t('plugins.gcodeViewer.loadCurrentJob.title')"
					   @click="toggleLiveView">
					<v-icon>{{ followingJob ? "mdi-cube-outline" : "mdi-printer-3d" }}</v-icon>
					<span class="gcv-btn-label">{{ followingJob ? $t("plugins.gcodeViewer.staticView.caption") : $t("plugins.gcodeViewer.loadCurrentJob.caption") }}</span>
				</v-btn>
				<v-btn v-if="loading" class="gcv-icon-btn" color="warning" size="small" @click="cancelLoad">
					<v-icon color="error">mdi-cancel</v-icon>
					<span class="gcv-btn-label">{{ $t("plugins.gcodeViewer.cancelLoad") }}</span>
				</v-btn>
			</div>

			<div :class="{ 'button-container-drawer': drawer }" class="gcv-category-container">
				<v-btn v-for="category in railCategories" :key="category.key" class="gcv-icon-btn"
					   :color="openCategory === category.key ? 'secondary' : 'primary'" size="small"
					   @click="toggleCategory(category.key)">
					<v-icon>{{ category.icon }}</v-icon>
					<span class="gcv-btn-label">{{ category.caption }}</span>
				</v-btn>
			</div>

			<div :class="{ 'button-container-drawer': drawer }" class="gcv-settings-container">
				<v-btn class="gcv-icon-btn" :color="openCategory === 'settings' ? 'secondary' : 'primary'"
					   size="small" @click="toggleCategory('settings')">
					<v-icon>{{ settingsCategory.icon }}</v-icon>
					<span class="gcv-btn-label">{{ settingsCategory.caption }}</span>
				</v-btn>
			</div>

			<!-- Kept outside the sidebar so chooseFile() always finds it, no matter which category
				 is open (or whether any is) -->
			<input ref="fileInput" type="file" accept=".g,.gcode,.gc,.gco,.nc,.ngc,.tap" hidden
				   @change="fileSelected" />

			<!-- Settings panel: plain absolutely-positioned child of `.viewer-box` rather than a
				 v-navigation-drawer, because the drawer's teleport + overlay layer fights the
				 in-component containment we need. Normal mode: viewer-box is
				 `position: absolute; inset: 0` so the panel stays within the viewer card and
				 doesn't bleed over the status panel above. Fullscreen mode: viewer-box becomes
				 `position: fixed; inset: 0` and the panel covers the viewport with it -->
			<div v-if="drawer" class="gcv-settings-backdrop" @click="openCategory = null" />
			<Transition name="gcv-settings-slide">
				<aside v-if="openCategoryEntry" class="gcv-settings-panel">
					<div class="gcv-settings-header d-flex align-center">
						<v-icon class="mr-2">{{ openCategoryEntry.icon }}</v-icon>
						<strong>{{ openCategoryEntry.caption }}</strong>
						<v-spacer />
						<v-btn icon="mdi-close" variant="text" size="small" density="comfortable"
							   :title="$t('generic.close')" @click="openCategory = null" />
					</div>
					<v-divider />

					<div class="gcv-settings-body">
						<template v-if="openCategory === 'view'">
							<div class="d-flex flex-column ga-2">
								<v-btn :title="$t('plugins.gcodeViewer.resetCamera.title')" block color="primary"
									   prepend-icon="mdi-camera" @click="reset">
									{{ $t("plugins.gcodeViewer.resetCamera.caption") }}
								</v-btn>
								<v-btn v-if="canToggleLiveView" block color="secondary"
									   :title="followingJob ? $t('plugins.gcodeViewer.staticView.title') : $t('plugins.gcodeViewer.loadCurrentJob.title')"
									   :prepend-icon="followingJob ? 'mdi-cube-outline' : 'mdi-printer-3d'"
									   @click="toggleLiveView">
									{{ followingJob ? $t("plugins.gcodeViewer.staticView.caption") : $t("plugins.gcodeViewer.loadCurrentJob.caption") }}
								</v-btn>
								<v-btn v-if="hasGCode" :disabled="loading" :title="$t('plugins.gcodeViewer.unloadGCode.title')"
									   block color="primary" prepend-icon="mdi-video-3d-off" @click="clearScene">
									{{ $t("plugins.gcodeViewer.unloadGCode.caption") }}
								</v-btn>
								<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.loadLocalGCode.title')" block
									   color="primary" prepend-icon="mdi-file" @click="chooseFile">
									{{ $t("plugins.gcodeViewer.loadLocalGCode.caption") }}
								</v-btn>

								<v-divider class="my-1" />

								<div class="d-flex flex-column">
									<v-switch v-model="showObjectSelection" :disabled="!canCancelObject"
											  :title="$t('plugins.gcodeViewer.showObjectSelection.title')"
											  :label="jobSelectionLabel" color="primary" hide-details />
									<v-switch v-if="showObjectSelection" v-model="showObjectLabels"
											  :label="$t('plugins.gcodeViewer.showObjectLabels')"
											  color="primary" hide-details class="ml-13" />
									<v-switch v-model="showTool" :label="$t('plugins.gcodeViewer.showTool')"
											  color="primary" hide-details />
									<v-switch v-model="showTravelLines" :label="$t('plugins.gcodeViewer.showTravels')"
											  color="primary" hide-details />
									<v-switch v-if="showTravelLines" v-model="persistTravels"
											  :label="$t('plugins.gcodeViewer.persistTravels')"
											  color="primary" hide-details class="ml-13" />
									<v-switch v-if="!isEmbedded" v-model="viewGCode"
											  :label="$t('plugins.gcodeViewer.viewGCode')"
											  color="primary" hide-details />
									<v-switch v-model="g1AsExtrusion" :disabled="loading"
											  :label="$t('plugins.gcodeViewer.g1AsExtrusion')"
											  :title="$t('plugins.gcodeViewer.g1AsExtrusionHint')"
											  color="primary" hide-details />
									<v-switch v-model="cameraInertia" :label="$t('plugins.gcodeViewer.cameraInertia')"
											  color="primary" hide-details />
								</div>
							</div>
						</template>

						<template v-else-if="openCategory === 'quality'">
							<div class="d-flex flex-column ga-3">
								<v-select v-model="geometryMode" :items="geometryModeItems"
										  :label="$t('plugins.gcodeViewer.geometry.caption')"
										  :title="$t('plugins.gcodeViewer.geometry.title')"
										  density="compact" variant="outlined"
										  hide-details class="mt-2" />
								<div class="d-flex flex-column">
									<v-switch v-model="useHQRendering" :label="$t('plugins.gcodeViewer.useHQRendering')"
											  :title="$t('plugins.gcodeViewer.useHQRenderingHint')"
											  color="primary" hide-details />
									<v-text-field v-if="useHQRendering" v-model.number="nozzleDiameter" type="number"
												  :label="$t('plugins.gcodeViewer.nozzleDiameter')"
												  :title="$t('plugins.gcodeViewer.nozzleDiameterHint')"
												  :placeholder="$t('plugins.gcodeViewer.nozzleDiameterAuto')"
												  min="0" max="5" step="0.05" density="compact"
												  variant="outlined" hide-details class="mt-2 ml-6" />
									<v-switch v-model="perimeterOnly" :label="$t('plugins.gcodeViewer.perimeterOnly')"
											  color="primary" hide-details />
									<v-switch v-model="specular" :label="$t('plugins.gcodeViewer.useSpecular')"
											  color="primary" hide-details />
								</div>
							</div>
						</template>

						<template v-else-if="openCategory === 'colors'">
							<div class="d-flex flex-column ga-3">
								<v-select v-model="colorMode" :items="colorModeItems" :disabled="loading"
										  :label="$t('plugins.gcodeViewer.renderMode.caption', 1)"
										  density="compact" variant="outlined" hide-details class="mt-2" />

								<v-expansion-panels v-model="openRenderModePanel" variant="accordion">
									<v-expansion-panel value="tool">
										<v-expansion-panel-title :title="$t('plugins.gcodeViewer.extruders.title')">
											<v-icon class="mr-2">mdi-printer-3d-nozzle</v-icon>
											<strong>{{ $t("plugins.gcodeViewer.extruders.caption") }}</strong>
										</v-expansion-panel-title>
										<v-expansion-panel-text>
											<div class="d-flex flex-column ga-3">
												<div v-for="(extruder, index) in toolColors" :key="index">
													<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.tool", [index]) }}</div>
													<ColorPicker :editcolor="extruder"
																 @updatecolor="(value) => updateColor(index, value)" />
												</div>
												<div class="d-flex ga-2">
													<v-btn class="flex-grow-1" color="primary" prepend-icon="mdi-plus"
														   :disabled="toolColors.length >= MAX_TOOL_COLORS"
														   @click="addExtruder">
														{{ $t("plugins.gcodeViewer.extruders.add") }}
													</v-btn>
													<v-btn class="flex-grow-1" color="primary" prepend-icon="mdi-minus"
														   :disabled="toolColors.length <= 1" @click="removeLastExtruder">
														{{ $t("plugins.gcodeViewer.extruders.removeLast") }}
													</v-btn>
												</div>
												<v-btn block color="warning" prepend-icon="mdi-restore" @click="resetExtruderColors">
													{{ $t("plugins.gcodeViewer.resetColor", toolColors.length) }}
												</v-btn>
											</div>
										</v-expansion-panel-text>
									</v-expansion-panel>

									<v-expansion-panel value="feedrate">
										<v-expansion-panel-title>
											<v-icon class="mr-2">mdi-speedometer</v-icon>
											<strong>{{ $t("plugins.gcodeViewer.feedrate") }}</strong>
										</v-expansion-panel-title>
										<v-expansion-panel-text>
											<div class="d-flex flex-column ga-3">
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
											</div>
										</v-expansion-panel-text>
									</v-expansion-panel>
								</v-expansion-panels>

								<div>
									<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.trailColor") }}</div>
									<ColorPicker :editcolor="trailColor"
												 @updatecolor="(value) => updateTrailColor(value)" />
								</div>

								<div>
									<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.bedRenderMode") }}</div>
									<v-btn-toggle v-model="bedRenderMode" mandatory class="d-flex mb-3">
										<v-btn :value="0" class="flex-grow-1">{{ $t("plugins.gcodeViewer.bed") }}</v-btn>
										<v-btn :value="1" class="flex-grow-1">{{ $t("plugins.gcodeViewer.volume") }}</v-btn>
									</v-btn-toggle>
									<div class="text-title-small mb-2">
										{{ bedRenderMode === 0 ? $t("plugins.gcodeViewer.gridColor") : $t("plugins.gcodeViewer.borderColor") }}
									</div>
									<ColorPicker :editcolor="bedColor"
												 @updatecolor="(value) => updateBedColor(value)" />
								</div>
								<div>
									<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.background") }}</div>
									<ColorPicker :editcolor="backgroundColor"
												 @updatecolor="(value) => updateBackground(value)" />
								</div>
							</div>
						</template>

						<template v-else-if="openCategory === 'inspection'">
							<div class="d-flex flex-column ga-3">
								<v-select v-model="unprintedMode" :items="unprintedModeItems"
										  :label="$t('plugins.gcodeViewer.unprinted.caption')"
										  :title="$t('plugins.gcodeViewer.unprinted.title')"
										  density="compact" variant="outlined" hide-details class="mt-2" />
								<div v-if="unprintedMode === 2" class="ml-6">
									<div class="text-title-small mb-2">{{ $t("plugins.gcodeViewer.progressColor") }}</div>
									<ColorPicker :editcolor="progressColor"
												 @updatecolor="(value) => updateProgressColor(value)" />
								</div>
								<div v-if="unprintedMode !== 0" class="ml-6">
									<div class="text-title-small mb-1">{{ $t("plugins.gcodeViewer.opacity") }}</div>
									<v-slider v-model="opacityPercent" min="1" max="100" thumb-label hide-details />
								</div>
								<div>
									<div class="text-title-small mb-1">{{ $t("plugins.gcodeViewer.trailDuration") }}</div>
									<v-slider v-model="trailDuration" min="0" max="60" step="1" thumb-label hide-details />
								</div>
								<div>
									<div class="text-title-small mb-1">{{ $t("plugins.gcodeViewer.topClipping") }}</div>
									<v-slider v-model="sliderHeight" :disabled="!hasGCode" :max="maxHeight"
											  :min="minHeight" step="0.1" thumb-label hide-details />
								</div>
								<div>
									<div class="text-title-small mb-1">{{ $t("plugins.gcodeViewer.bottomClipping") }}</div>
									<v-slider v-model="sliderBottomHeight" :disabled="!hasGCode" :max="maxHeight"
											  :min="minHeight" step="0.1" thumb-label hide-details />
								</div>
							</div>
						</template>

						<template v-else-if="openCategory === 'settings'">
							<div class="d-flex flex-column ga-3">
								<v-switch v-model="zBelt" :label="$t('plugins.gcodeViewer.zBelt')"
										  :title="$t('plugins.gcodeViewer.zBeltHint')"
										  color="primary" hide-details class="mt-2" />
								<v-select v-if="zBelt" v-model="zBeltAngle" :items="zBeltAngleItems"
										  :label="$t('plugins.gcodeViewer.zBeltAngle')"
										  :title="$t('plugins.gcodeViewer.zBeltAngleHint')"
										  density="compact" variant="outlined" hide-details class="ml-6" />

								<v-divider class="my-1" />

								<div class="d-flex flex-column">
									<v-switch v-model="showAxes" :label="$t('plugins.gcodeViewer.showAxes')"
											  color="primary" hide-details />
									<v-switch v-model="showRuler" :label="$t('plugins.gcodeViewer.showRuler')"
											  :title="$t('plugins.gcodeViewer.showRulerHint')"
											  color="primary" hide-details />
									<v-text-field v-if="showRuler" v-model.number="rulerInterval" type="number"
												  :label="$t('plugins.gcodeViewer.rulerInterval')"
												  :title="$t('plugins.gcodeViewer.rulerIntervalHint')"
												  :placeholder="$t('plugins.gcodeViewer.rulerIntervalAuto')"
												  min="0" max="500" step="5" density="compact"
												  variant="outlined" hide-details class="mt-2 ml-6" />
									<v-switch v-model="showWorkplace" :label="$t('plugins.gcodeViewer.showWorkplace')"
											  :title="$t('plugins.gcodeViewer.showWorkplaceHint')"
											  color="primary" hide-details />
									<v-switch v-model="showOverlay" :label="$t('plugins.gcodeViewer.showFSOverlay')"
											  color="primary" hide-details />
								</div>

								<v-btn block color="warning" prepend-icon="mdi-restore"
									   :title="$t('plugins.gcodeViewer.resetSettings.title')" @click="resetSettings">
									{{ $t("plugins.gcodeViewer.resetSettings.caption") }}
								</v-btn>
							</div>
						</template>
					</div>
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
					<v-col cols="2" class="d-flex flex-nowrap justify-center ga-1">
						<v-btn icon size="small" :title="scrubPlaying ? $t('plugins.gcodeViewer.stop') : $t('plugins.gcodeViewer.play')"
							   @click="simulatePlay">
							<v-icon>{{ scrubPlaying ? "mdi-stop" : "mdi-play" }}</v-icon>
						</v-btn>
						<v-btn icon size="small" :title="$t('plugins.gcodeViewer.fastForward')" @click="fastForward">
							<v-icon>mdi-fast-forward</v-icon>
						</v-btn>
					</v-col>
					<v-col cols="12" md="5">
						<v-btn-toggle v-model="scrubSpeed" mandatory rounded color="secondary" class="w-100">
							<v-btn :value="1" class="flex-grow-1">1x</v-btn>
							<v-btn :value="10" class="flex-grow-1">10x</v-btn>
							<v-btn :value="50" class="flex-grow-1">50x</v-btn>
							<v-btn :value="100" class="flex-grow-1">100x</v-btn>
							<v-btn :value="500" class="flex-grow-1">500x</v-btn>
							<v-btn :value="1000" class="flex-grow-1">1000x</v-btn>
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
import { type Job, KinematicsName, MachineMode, type Move, type State } from "@duet3d/objectmodel";
import { Viewer_Proxy } from "@duet3d/gcodeviewer";
import { useDisplay } from "vuetify";

import CodeButton from "@/components/buttons/CodeButton.vue";
import i18n from "@/i18n";
import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import { showConfirmDialog } from "@/composables/useConfirmDialog";
import { useSettingsStore } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import { isPrinting } from "@/utils/enums";
import Path from "@/utils/path";

import CodeStream from "./CodeStream.vue";
import { DEFAULT_TOOL_COLORS, MAX_TOOL_COLORS, TOOL_COLORS } from "./settings";
import ColorPicker from "./ColorPicker.vue";
import FSOverlay from "./FSOverlay.vue";

interface ObjectInfo {
	cancelled: boolean;
	index: number;
	name?: string;
}

// The colour render-mode toggle exposes color/feedrate/feature (values 0/1/2), which map onto the
// library's numeric render modes tool/feed-rate/feature (1/2/0)
const RENDER_MODE_MAP = [1, 2, 0];

const machineStore = useMachineStore();
const uiStore = useUiStore();
const cacheStore = useCacheStore();
const settingsStore = useSettingsStore();
const display = useDisplay();
const route = useRoute();

// The standalone page lives under /Plugins/GCodeViewer and sizes itself to the viewport; rendered
// anywhere else (e.g. as a tab in the Job Status view panel) it fills its container instead
const isEmbedded = computed(() => !route.path.startsWith("/Plugins/GCodeViewer"));

// Intentionally module-scope (not a ref) - the proxy holds a Worker/OffscreenCanvas that must not
// be walked by Vue's reactive proxy; the template never reads `viewer` directly
let viewer: Viewer_Proxy | null = null;

// Last loaded G-code text. The library renders in a worker and no longer exposes the file back, so
// we keep our own copy to feed the code-stream view and to re-load on "reload"
const loadedFileText = ref("");
const hasGCode = computed(() => loadedFileText.value !== "");

const primaryContainer = ref<HTMLElement | null>(null);
const viewerCanvas = ref<HTMLCanvasElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// Each configuration category gets its own icon button and its own sidebar; only one can be open
// at a time and pressing the active button closes it again
type ConfigCategory = "view" | "colors" | "quality" | "inspection" | "settings";

interface ConfigCategoryEntry {
	key: ConfigCategory;
	icon: string;
	caption: string;
}

const configCategories = computed<Array<ConfigCategoryEntry>>(() => [
	{ key: "view", icon: "mdi-eye", caption: i18n.global.t("plugins.gcodeViewer.viewActions.caption") },
	{ key: "colors", icon: "mdi-palette", caption: i18n.global.t("plugins.gcodeViewer.colors") },
	{ key: "quality", icon: "mdi-checkerboard", caption: i18n.global.t("plugins.gcodeViewer.quality") },
	{ key: "inspection", icon: "mdi-progress-clock", caption: i18n.global.t("plugins.gcodeViewer.inspection") },
	{ key: "settings", icon: "mdi-cog", caption: i18n.global.t("plugins.gcodeViewer.settings") }
]);

// The settings category is pinned to the bottom-left corner, every other one to the centered rail
const railCategories = computed(() => configCategories.value.filter((category) => category.key !== "settings"));
const settingsCategory = computed(() => configCategories.value.find((category) => category.key === "settings")!);

const openCategory = ref<ConfigCategory | null>(null);
const openCategoryEntry = computed(() => configCategories.value.find((category) => category.key === openCategory.value));
const drawer = computed(() => openCategory.value !== null);

// Colour settings belonging to each render mode, indexed like colorMode. Feature colouring comes
// from the slicer, so it has nothing to configure
const RENDER_MODE_PANELS: Array<string | undefined> = ["tool", "feedrate", undefined];
const openRenderModePanel = ref<string | undefined>(undefined);

function toggleCategory(key: ConfigCategory) {
	if (key === "colors" && openCategory.value !== key) {
		openRenderModePanel.value = RENDER_MODE_PANELS[colorMode.value];
	}
	openCategory.value = (openCategory.value === key) ? null : key;
}

// The library builds one [box, cylinder, line] mesh variant per chunk, so these are the only three
// geometry qualities that exist; the values are the library's mesh mode numbers
const geometryModeItems = computed(() => [
	{ title: i18n.global.t("plugins.gcodeViewer.geometry.line"),   value: 2 },
	{ title: i18n.global.t("plugins.gcodeViewer.geometry.normal"), value: 0 },
	{ title: i18n.global.t("plugins.gcodeViewer.geometry.high"),   value: 1 },
]);
const zBeltAngleItems = [15, 25, 35, 45].map((angle) => ({ title: `${angle}°`, value: angle }));
// How the part that has not been printed yet is drawn. Hiding it, drawing it in its own colours and
// drawing it in the progress colour are mutually exclusive, so they are one setting rather than two
// switches whose combinations nobody can predict
const unprintedModeItems = computed(() => [
	{ title: i18n.global.t("plugins.gcodeViewer.unprinted.hidden"),   value: 0 },
	{ title: i18n.global.t("plugins.gcodeViewer.unprinted.original"), value: 1 },
	{ title: i18n.global.t("plugins.gcodeViewer.unprinted.progress"), value: 2 },
]);
const colorModeItems = computed(() => [
	{ title: i18n.global.t("plugins.gcodeViewer.color"),    value: 0 },
	{ title: i18n.global.t("plugins.gcodeViewer.feedrate"), value: 1 },
	{ title: i18n.global.t("plugins.gcodeViewer.feature"),  value: 2 },
]);
const loading = ref(false);
const selectedFile = ref("");
const maxHeight = ref(0);
const minHeight = ref(0);
const sliderHeight = ref(0);
const sliderBottomHeight = ref(0);
const showObjectSelection = ref(false);
const objectDialogData = reactive({
	showDialog: false,
	info: {} as ObjectInfo,
});
const hoverLabel = ref("");
const fullscreen = ref(false);
const loadingMessage = ref("");
const scrubPosition = ref(0);
const scrubFileSize = ref(0);
const scrubPlaying = ref(false);
const scrubSpeed = ref(1);
let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
const fileData = ref("");

// True only while the viewer actively follows the running print head (live tracking). The Job
// Status tab turns this on automatically; the standalone page leaves it off and renders the whole
// file as finished, so the user can scrub it - they opt into live view via the "load current job"
// button, which also re-enables per-object cancellation
const followingJob = ref(false);

// The scene, bed, camera and build-object machinery are created inside the worker's async engine
// init, so config messages sent before it finishes would hit an undefined scene and be dropped.
// The library posts a `ready` event when init completes; whenReady() gates the first config + load
let viewerReady = false;
let readyWaiters: Array<() => void> = [];
function whenReady(): Promise<void> {
	if (viewerReady) {
		return Promise.resolve();
	}
	return new Promise((resolve) => readyWaiters.push(resolve));
}

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

const filePosition = computed(() => Number(machineStore.printingFilePosition ?? 0));

const kinematicsName = computed(() => move.value.kinematics.name);
const isDelta = computed(() => kinematicsName.value === KinematicsName.linearDelta
	|| kinematicsName.value === KinematicsName.rotaryDelta);

// Axis bounds string that changes whenever an X/Y/Z min or max does, so the build volume can be
// pushed to the viewer without a deep watch on the whole move object
const axisBoundsKey = computed(() => move.value.axes
	.filter((axis) => "XYZ".includes(axis.letter))
	.map((axis) => `${axis.letter}:${axis.min}:${axis.max}`)
	.join(","));

// Last resort for the extrusion width: machines with more than one nozzle size conventionally carry
// it in the tool name ("Left 0.4", "0.8 nozzle"). Only meaningful in FFF mode, since a CNC or laser
// tool name has no diameter to find
const nozzleDiameterFromToolName = computed<number | null>(() => {
	if (state.value.machineMode !== MachineMode.fff) {
		return null;
	}
	for (const tool of machineStore.model.tools) {
		const match = /0\.\d+/.exec(tool?.name ?? "");
		if (match !== null) {
			return Number(match[0]);
		}
	}
	return null;
});

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
// Everything the sidebars expose is persisted so it survives a reload. Transient viewer state (the
// scrubber, fullscreen, the per-file Z bounds) deliberately stays in plain refs
const settingDefaults = new Map<string, unknown>();

function cachedSetting<T>(key: string, fallback: T) {
	settingDefaults.set(key, fallback);
	return computed<T>({
		get: () => pluginCache.value?.[key] ?? fallback,
		set: (value) => cacheStore.setPluginData("GCodeViewer", key, value),
	});
}

const toolColors = cachedSetting<string[]>("toolColors", DEFAULT_TOOL_COLORS);
const backgroundColor = cachedSetting("backgroundColor", "#000000FF");
// Matches the library's own default bed line colour. Falsy rather than nullish coalescing because
// caches written by earlier versions hold an empty string here, which is not a usable colour
const bedColor = computed<string>({
	get: () => pluginCache.value?.bedColor || "#0000FF",
	set: (value) => cacheStore.setPluginData("GCodeViewer", "bedColor", value),
});
settingDefaults.set("bedColor", "#0000FF");
settingDefaults.set("viewGCode", false);
const bedRenderMode = cachedSetting("bedRenderMode", 0);
const progressColor = cachedSetting("progressColor", "#FFFFFFFF");
const trailColor = cachedSetting("trailColor", "#FFFFFF");
const trailDuration = cachedSetting("trailDuration", 10);
const showTravelLines = cachedSetting("showTravels", false);
const showAxes = cachedSetting("showAxes", true);
const showRuler = cachedSetting("showRuler", false);
const rulerInterval = cachedSetting("rulerInterval", 0);
const showObjectLabels = cachedSetting("showObjectLabels", true);
const showOverlay = cachedSetting("showOverlay", true);
const cameraInertia = cachedSetting("cameraInertia", true);
const perimeterOnly = cachedSetting("perimeterOnly", false);
const unprintedMode = cachedSetting("unprintedMode", 0);
const opacityPercent = cachedSetting("opacityPercent", 5);
// Feature colouring (colorMode 2 -> library Feature mode), the colourful per-feature view
const colorMode = cachedSetting("colorMode", 2);
const minColorRate = cachedSetting("minColorRate", 20);
const maxColorRate = cachedSetting("maxColorRate", 60);
const minFeedColor = cachedSetting("minFeedColor", "#0000FF");
const maxFeedColor = cachedSetting("maxFeedColor", "#FF0000");

const useHQRendering = cachedSetting("useHQRendering", false);

const specular = cachedSetting("useSpecular", true);

const g1AsExtrusion = cachedSetting("g1AsExtrusion", false);

// The embedded Job Status tab has its own G-code stream tab next to the viewer, so the built-in
// code view stays exclusive to the standalone page
const viewGCode = computed<boolean>({
	get: () => !isEmbedded.value && (pluginCache.value?.viewGCode ?? false),
	set: (value) => {
		cacheStore.setPluginData("GCodeViewer", "viewGCode", value);
		fileData.value = value ? loadedFileText.value : "";
		nextTick(() => pokeViewerResize());
	},
});

const zBelt = cachedSetting("zBelt", false);

const zBeltAngle = cachedSetting("zBeltAngle", 45);

// What the loaded file itself specified, null if it said nothing
const parsedNozzleDiameter = ref<number | null>(null);

// 0 leaves the diameter to the file and then to the tool names
const nozzleDiameter = cachedSetting("nozzleDiameter", 0);

const showWorkplace = cachedSetting("showWorkplace", true);

// Machine-agnostic on purpose: the same marker stands in for a nozzle, a spindle or a laser
const showTool = cachedSetting("showTool", false);

const persistTravels = cachedSetting("persistTravels", false);

const geometryMode = cachedSetting("geometryMode", 0);

// #endregion

// #region Layout-driven class swaps
const viewerClass = computed(() => viewGCode.value ? "babylon-canvas-codeview" : "babylon-canvas");

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

// #endregion

// #region Viewer events
function handleViewerEvent(e: any) {
	if (!e || !e.type) {
		return;
	}
	switch (e.type) {
		case "ready":
			viewerReady = true;
			readyWaiters.forEach((resolve) => resolve());
			readyWaiters = [];
			break;
		case "progress":
			loadingMessage.value = e.label ?? "";
			break;
		case "fileloaded":
			scrubFileSize.value = e.end ?? 0;
			parsedNozzleDiameter.value = e.nozzleDiameter ?? null;
			// Tools + render materials are rebuilt by the load, so (re-)apply the current UI state
			// now that they exist - doing this before the load would touch an undefined modelMaterial
			updateTools();
			applyRenderSettings();
			viewer?.setAnimationSpeed(scrubSpeed.value);
			viewer?.requestPrintBounds();
			// While following a live job, disable click-to-seek and snap the head to the printer's
			// current position (the fresh load renders the whole file as finished until we do)
			viewer?.setAllowSeek(!followingJob.value);
			viewer?.setLiveTracking(followingJob.value);
			if (followingJob.value) {
				viewer?.updateFilePosition(filePosition.value);
			}
			// Embedded job view frames the printed geometry; the standalone page frames the whole bed
			if (isEmbedded.value) {
				viewer?.frameToPrint();
			} else {
				viewer?.resetCamera();
			}
			loading.value = false;
			localStorage.removeItem(RENDER_FLAG_KEY);
			break;
		case "loaderror":
		case "loadcancelled":
			loading.value = false;
			localStorage.removeItem(RENDER_FLAG_KEY);
			break;
		case "printbounds":
			// The bounds come off the mesh bounding box as raw floats, and the clipping sliders step
			// relative to their minimum - without snapping to the same 0.1 grid every step would
			// carry the minimum's fraction along with it
			minHeight.value = Math.floor((e.minHeight ?? 0) * 10) / 10;
			maxHeight.value = Math.ceil((e.maxHeight ?? 0) * 10) / 10;
			sliderHeight.value = maxHeight.value;
			sliderBottomHeight.value = minHeight.value;
			break;
		case "positionupdate":
			scrubPosition.value = e.position ?? 0;
			break;
		case "objectSelected":
			objectDialogData.info = e.object as ObjectInfo;
			objectDialogData.showDialog = true;
			break;
		case "objectLabel":
			hoverLabel.value = showObjectSelection.value ? (e.name ?? "") : "";
			break;
		case "animationPositionUpdate":
			if (scrubPlaying.value) {
				scrubPosition.value = e.position ?? scrubPosition.value;
			}
			break;
		case "animationStopped":
			scrubPlaying.value = false;
			break;
	}
}

// #endregion

// #region Viewer configuration
// Full scene configuration, applied once the worker signals `ready` and whenever a printer setting
// it depends on changes
function applyViewerConfig() {
	if (!viewer) {
		return;
	}
	setBuildVolumeFromAxes();
	viewer.setDeltaBed(isDelta.value);
	viewer.setBedRenderMode(bedRenderMode.value);
	viewer.setBedColor(bedColor.value);
	viewer.setBackgroundColor(backgroundColor.value);
	viewer.showAxes(showAxes.value);
	viewer.setRulerInterval(rulerInterval.value > 0 ? rulerInterval.value : null);
	viewer.showRuler(showRuler.value);
	viewer.showObjectLabels(showObjectLabels.value);
	viewer.showWorkplace(showWorkplace.value);
	viewer.toggleNozzle(showTool.value);
	viewer.setCameraInertia(cameraInertia.value);
	applyParseSettings();
	viewer.resetCamera();
}

// Render-material settings applied from the `fileloaded` handler, once the materials exist. These
// only tweak the existing meshes' materials, so they are cheap and never reparse
function applyRenderSettings() {
	if (!viewer) {
		return;
	}
	viewer.setRenderMode(RENDER_MODE_MAP[colorMode.value] ?? 1);
	viewer.setAlphaMode(unprintedMode.value === 1);
	viewer.setProgressMode(unprintedMode.value === 2);
	viewer.setMeshMode(geometryMode.value);
	viewer.setUnprintedOpacity(opacityPercent.value / 100);
	viewer.setProgressColor(progressColor.value);
	viewer.setTrailColor(trailColor.value);
	viewer.setTrailDuration(trailDuration.value);
	viewer.setShowTravels(showTravelLines.value);
	viewer.setPersistTravels(persistTravels.value);
	viewer.setSpecular(specular.value);
	applyFeedRateColoring();
	viewer.setPerimeterOnly(perimeterOnly.value);
}

// Feed rates are shown in mm/s but the library works in mm/min like the G-code itself
function applyFeedRateColoring() {
	viewer?.setFeedRateRange(minColorRate.value * 60, maxColorRate.value * 60);
	viewer?.setFeedRateColors(minFeedColor.value, maxFeedColor.value);
}

// Parse-time settings. They only take hold on the next load, so callers that change one have to
// reload the file themselves
function applyParseSettings() {
	viewer?.setNozzleDiameter(nozzleDiameter.value > 0 ? nozzleDiameter.value : null, nozzleDiameterFromToolName.value);
	viewer?.setG1AsExtrusion(g1AsExtrusion.value);
	viewer?.setHQRendering(useHQRendering.value);
	viewer?.setZBelt(zBelt.value, zBeltAngle.value);
}

function reloadAfterParseSettingChange() {
	applyParseSettings();
	if (hasGCode.value && !loading.value) {
		reloadviewer();
	}
}

function setBuildVolumeFromAxes() {
	if (!viewer) {
		return;
	}
	const volume = { x: { min: 0, max: 0 }, y: { min: 0, max: 0 }, z: { min: 0, max: 0 } };
	for (const axis of move.value.axes) {
		const letter = axis.letter.toLowerCase();
		if (letter === "x" || letter === "y" || letter === "z") {
			volume[letter].min = axis.min ?? 0;
			volume[letter].max = axis.max ?? 0;
		}
	}
	viewer.setBuildVolume(volume);
}

function updateTools() {
	viewer?.setTools(toolColors.value.map((color) => ({ color, diameter: 0.4 })));
}

// #endregion

// #region Loading
// A tab killed while building the meshes (the classic SBC failure) leaves this breadcrumb behind,
// and the next load drops to the cheapest geometry instead of repeating the crash. localStorage
// rather than the plugin cache because it is written synchronously and so survives a hard crash
const RENDER_FLAG_KEY = "gcodeViewer.renderInProgress";

function renderCrashRecovery() {
	if (localStorage.getItem(RENDER_FLAG_KEY) === "true") {
		localStorage.removeItem(RENDER_FLAG_KEY);
		if (geometryMode.value !== 2) {
			geometryMode.value = 2;
			uiStore.log(LogLevel.warning, i18n.global.t("plugins.gcodeViewer.geometry.caption"), i18n.global.t("plugins.gcodeViewer.geometry.recovered"));
		}
	}
	localStorage.setItem(RENDER_FLAG_KEY, "true");
}

async function loadText(text: string) {
	loadedFileText.value = text;
	fileData.value = viewGCode.value ? text : "";
	await whenReady();
	if (!viewer) {
		return;
	}
	renderCrashRecovery();
	loading.value = true;
	scrubPlaying.value = false;
	scrubPosition.value = 0;
	viewer.loadFile(text);
}

async function loadSdFile(path: string) {
	selectedFile.value = path;
	followingJob.value = false;
	loading.value = true;
	try {
		const blob = await machineStore.download({ filename: Path.combine(path), type: "text" }, false, false, false);
		await loadText(String(blob));
	} catch {
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

// Loads the job currently being processed, but only when the viewer is idle and empty - an
// explicit file selection or an in-progress load is left untouched. The embedded Job Status tab
// follows the live print head; the standalone page renders the whole file as finished instead
function autoLoadRunningJob() {
	if (isJobRunning.value && !loading.value && !visualizingCurrentJob.value && selectedFile.value === "") {
		loadRunningJob(isEmbedded.value);
	}
}

async function loadRunningJob(live = true) {
	if (!job.value.file) {
		return;
	}
	selectedFile.value = job.value.file.fileName;
	followingJob.value = live;
	loading.value = true;
	try {
		const blob = await machineStore.download({ filename: job.value.file.fileName, type: "text" }, false, false, false);
		await loadText(String(blob));
		await whenReady();
		viewer?.loadObjectBoundaries(plainObjects(job.value.build?.objects));
		if (live) {
			viewer?.updateFilePosition(filePosition.value);
		}
	} catch {
		loading.value = false;
	}
}

// Live view follows the print head and locks seeking, static view renders the whole file and hands
// control back to the scrubber. Only the standalone page offers the choice - the embedded Job
// Status tab always follows the running job
const canToggleLiveView = computed(() => !isEmbedded.value && isJobRunning.value && !loading.value);

function showWholeFile() {
	scrubPosition.value = scrubFileSize.value;
	viewer?.updateFilePosition(scrubFileSize.value);
}

async function toggleLiveView() {
	if (followingJob.value) {
		followingJob.value = false;
		showWholeFile();
	} else if (visualizingCurrentJob.value) {
		viewer?.stopNozzleAnimation();
		scrubPlaying.value = false;
		followingJob.value = true;
		viewer?.updateFilePosition(filePosition.value);
	} else {
		await loadRunningJob(true);
	}
}

async function fileSelected(e: Event) {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = "";
	if (!file) {
		return;
	}
	selectedFile.value = "";
	followingJob.value = false;
	loading.value = true;
	await loadText(await file.text());
}

async function reloadviewer() {
	if (loading.value || !hasGCode.value) {
		return;
	}
	await loadText(loadedFileText.value);
}

function clearScene() {
	selectedFile.value = "";
	loadedFileText.value = "";
	fileData.value = "";
	scrubFileSize.value = 0;
	scrubPosition.value = 0;
	viewer?.reset();
	viewer?.loadObjectBoundaries([]);
}

function cancelLoad() {
	viewer?.cancel();
	loading.value = false;
}

function chooseFile() {
	if (!loading.value) {
		fileInput.value?.click();
	}
}

// #endregion

// #region Playback + scrubbing
function scrubPositionChanged(value: number) {
	scrubPosition.value = value;
	viewer?.updateFilePosition(value);
}

function simulatePlay() {
	if (!viewer) {
		return;
	}
	if (scrubPlaying.value) {
		viewer.stopNozzleAnimation();
		scrubPlaying.value = false;
	} else {
		// Parked at the end (finished playback or fast-forward): rewind before replaying
		if (scrubPosition.value >= scrubFileSize.value) {
			scrubPosition.value = 0;
			viewer.updateFilePosition(0);
		}
		viewer.startNozzleAnimation();
		scrubPlaying.value = true;
	}
}

function fastForward() {
	if (!viewer) {
		return;
	}
	viewer.stopNozzleAnimation();
	scrubPlaying.value = false;
	scrubPosition.value = scrubFileSize.value;
	viewer.updateFilePosition(scrubFileSize.value);
}

// #endregion

// #region Colours + camera
function updateColor(index: number, value: string) {
	const next = toolColors.value.slice();
	next[index] = value;
	toolColors.value = next;
}

function addExtruder() {
	// Keep following the heater colors, wrapping once the list runs out
	toolColors.value = [...toolColors.value, TOOL_COLORS[toolColors.value.length % TOOL_COLORS.length]];
}

function removeLastExtruder() {
	toolColors.value = toolColors.value.slice(0, -1);
}

function resetExtruderColors() {
	toolColors.value = [...DEFAULT_TOOL_COLORS];
}

async function resetSettings() {
	if (!await showConfirmDialog(i18n.global.t("plugins.gcodeViewer.resetSettings.caption"), i18n.global.t("plugins.gcodeViewer.resetSettings.prompt"), "mdi-restore")) {
		return;
	}
	for (const [key, value] of settingDefaults) {
		cacheStore.setPluginData("GCodeViewer", key, value);
	}
	// Written straight to the cache above, so viewGCode's own setter did not run
	fileData.value = viewGCode.value ? loadedFileText.value : "";
	applyViewerConfig();
	applyRenderSettings();
}

function updateBackground(value: string) {
	backgroundColor.value = value;
	viewer?.setBackgroundColor(value);
}

function updateBedColor(value: string) {
	bedColor.value = value;
	viewer?.setBedColor(value);
}

function updateProgressColor(value: string) {
	progressColor.value = value;
	viewer?.setProgressColor(value);
}

function updateTrailColor(value: string) {
	trailColor.value = value;
	viewer?.setTrailColor(value);
}

// Feed-rate colouring has no library method yet; the pickers are shown greyed-out. The setters keep
// the bound value in sync so the choice survives until support returns
function updateMinFeedColor(value: string) {
	minFeedColor.value = value;
}

function updateMaxFeedColor(value: string) {
	maxFeedColor.value = value;
}

function reset() {
	if (isEmbedded.value) {
		viewer?.frameToPrint(true);
	} else {
		viewer?.resetCamera(true);
	}
}

// #endregion

// #region Object cancellation
// Build objects are reactive OM proxies; the render worker receives them via postMessage (structured
// clone), which rejects a Proxy, so hand over a plain deep copy
function plainObjects(objects: any[] | undefined): any[] {
	return JSON.parse(JSON.stringify(objects ?? []));
}

async function objectDialogCancelObject() {
	objectDialogData.showDialog = false;
	const action = objectDialogData.info.cancelled ? "U" : "P";
	await machineStore.sendCode(`M486 ${action}${objectDialogData.info.index}`);
	objectDialogData.info = {} as ObjectInfo;
}

// #endregion

// #region Layout + resize
function applyContainerHeight() {
	if (!primaryContainer.value || isEmbedded.value) {
		return;
	}
	// On the standalone page the container has no bounded height of its own, so size it to the
	// viewport minus the appbar + container padding (floored so a cramped window stays usable).
	// xs/sm: layout strips its outer padding, but the viewer adds an 8px breathing margin
	// (top + bottom = 16) on top of the appbar. md+ uses the layout's 16px top/bottom padding (32)
	const mainElement = document.querySelector(".v-main");
	const appBarHeight = mainElement
		? parseInt(getComputedStyle(mainElement).getPropertyValue("--v-layout-top")) || 64
		: 64;
	const chrome = appBarHeight + (display.mdAndUp.value ? 32 : 16);
	const viewerHeight = Math.max(window.innerHeight - chrome, 400);
	primaryContainer.value.style.height = `${viewerHeight}px`;
}

// The proxy re-reads the offscreen canvas size from its own window `resize` handler, so a
// dispatched resize is the way to tell the worker about layout changes it can't observe on its own
// (fullscreen, the code-view split). Guarded so our own window-resize listener below doesn't recurse
let suppressWindowResize = false;
function pokeViewerResize() {
	suppressWindowResize = true;
	window.dispatchEvent(new Event("resize"));
	suppressWindowResize = false;
}

function onWindowResize() {
	if (suppressWindowResize) {
		return;
	}
	if (resizeDebounce) {
		clearTimeout(resizeDebounce);
	}
	resizeDebounce = setTimeout(() => {
		applyContainerHeight();
		pokeViewerResize();
	}, 150);
}

// The fullscreen overlay is teleported to the body and covers the viewport, so the page behind it
// must not keep its own scrollbar
function setPageScrollLock(locked: boolean) {
	document.documentElement.style.overflow = locked ? "hidden" : "";
}

function toggleFullScreen() {
	fullscreen.value = !fullscreen.value;
	nextTick(() => pokeViewerResize());
}

function onKeyUp(e: KeyboardEvent) {
	if (e.key === "Escape" || e.key === "Esc") {
		fullscreen.value = false;
		nextTick(() => pokeViewerResize());
	}
}

// #endregion

// #region Lifecycle
// onActivated also fires on the initial mount when this component sits inside a kept-alive tree
// (the Job Status view panel), so the initial load is driven from onMounted alone and onActivated
// only re-resolves the route on a genuine re-activation (navigating back to the page)
let initialLoadDone = false;

onMounted(async () => {
	if (!viewerCanvas.value) {
		return;
	}
	viewer = new Viewer_Proxy(viewerCanvas.value);
	viewer.passThru = handleViewerEvent;
	try {
		await viewer.enableWasmProcessing();
	} catch {
		// WASM is an optional fast path; the TypeScript parser still renders without it
	}

	window.addEventListener("keyup", onKeyUp);
	window.addEventListener("resize", onWindowResize);

	await whenReady();
	applyViewerConfig();
	nextTick(() => {
		applyContainerHeight();
		pokeViewerResize();
	});

	// A file deep-linked into the route (Jobs list "View 3D" navigation arrives this way) loads
	// immediately; at the bare path the viewer falls back to the running job instead
	initialLoadDone = true;
	loadFromRoute();
});

onActivated(() => {
	viewer?.suspend(false);
	setPageScrollLock(fullscreen.value);
	if (initialLoadDone) {
		loadFromRoute();
		// The kept-alive subtree was detached from the DOM, so the canvas missed any layout changes
		// that happened while another page was shown; re-measure once it is back in the document
		nextTick(() => {
			applyContainerHeight();
			pokeViewerResize();
		});
	}
});
onDeactivated(() => {
	viewer?.suspend(true);
	setPageScrollLock(false);
});
watch(sdPathFromRoute, loadFromRoute);

onBeforeUnmount(() => {
	window.removeEventListener("keyup", onKeyUp);
	window.removeEventListener("resize", onWindowResize);
	if (resizeDebounce) {
		clearTimeout(resizeDebounce);
	}
	viewer?.unload();
	viewer = null;
	setPageScrollLock(false);
});

// #endregion

// #region Watches
watch(fullscreen, setPageScrollLock);
watch(colorMode, (to) => viewer?.setRenderMode(RENDER_MODE_MAP[to] ?? 1));
watch(perimeterOnly, (to) => viewer?.setPerimeterOnly(to));
watch(unprintedMode, (to) => {
	viewer?.setAlphaMode(to === 1);
	viewer?.setProgressMode(to === 2);
});
watch(opacityPercent, (to) => viewer?.setUnprintedOpacity(to / 100));
watch(trailDuration, (to) => viewer?.setTrailDuration(to));
watch(scrubSpeed, (to) => viewer?.setAnimationSpeed(to));
watch(showTravelLines, (to) => viewer?.setShowTravels(to));
watch(cameraInertia, (to) => viewer?.setCameraInertia(to));
watch(followingJob, (to) => {
	viewer?.setAllowSeek(!to);
	viewer?.setLiveTracking(to);
});

// Top/bottom Z clipping. Keep the two thumbs from crossing, then push both plane heights (with a
// one-layer margin on each end) regardless of which thumb moved
function applyZClip() {
	viewer?.setZClipPlane(sliderHeight.value + 1, sliderBottomHeight.value - 1);
}
watch(sliderHeight, (newValue) => {
	if (sliderBottomHeight.value > newValue) {
		sliderBottomHeight.value = newValue - 1;
	}
	applyZClip();
});
watch(sliderBottomHeight, (newValue) => {
	if (sliderHeight.value < newValue) {
		sliderHeight.value = newValue + 1;
	}
	applyZClip();
});
watch(geometryMode, (to) => viewer?.setMeshMode(to));
watch(colorMode, (to) => {
	openRenderModePanel.value = RENDER_MODE_PANELS[to];
});
watch(persistTravels, (to) => viewer?.setPersistTravels(to));
watch(specular, (to) => viewer?.setSpecular(to));
watch(showWorkplace, (to) => viewer?.showWorkplace(to));
watch(showTool, (to) => viewer?.toggleNozzle(to));
watch([minColorRate, maxColorRate, minFeedColor, maxFeedColor], () => applyFeedRateColoring());
// Parse-time settings: nothing changes until the file has been read again
watch([g1AsExtrusion, useHQRendering, zBelt, zBeltAngle, nozzleDiameter], () => reloadAfterParseSettingChange());

// The tool name is the last resort, so renaming a tool only forces a reparse when neither the
// manual override nor the file itself supplied a diameter
watch(nozzleDiameterFromToolName, () => {
	if (useHQRendering.value && nozzleDiameter.value <= 0 && parsedNozzleDiameter.value === null) {
		reloadAfterParseSettingChange();
	}
});
watch(bedRenderMode, (to) => viewer?.setBedRenderMode(to));
watch(showAxes, (to) => viewer?.showAxes(to));
watch(showRuler, (to) => viewer?.showRuler(to));
watch(rulerInterval, (to) => viewer?.setRulerInterval(to > 0 ? to : null));
watch(showObjectLabels, (to) => viewer?.showObjectLabels(to));
watch(toolColors, () => updateTools(), { deep: true });
watch(axisBoundsKey, () => setBuildVolumeFromAxes());

watch(isDelta, (to) => {
	viewer?.setDeltaBed(to);
	viewer?.resetCamera();
});

watch(showObjectSelection, (newValue) => {
	if (!viewer) {
		return;
	}
	if (canCancelObject.value) {
		viewer.loadObjectBoundaries(plainObjects(job.value.build?.objects));
		viewer.showObjectSelection(newValue);
	} else {
		showObjectSelection.value = false;
		hoverLabel.value = "";
	}
});

watch(() => job.value.build?.objects, (newValue) => {
	if (viewer && newValue) {
		viewer.loadObjectBoundaries(plainObjects(newValue));
	}
}, { deep: true });

// The printer's own axis positions are authoritative for the tool marker - the parsed file only
// knows where the head should be, and while following a live job we want where it actually is
const toolPosition = computed(() => {
	const position = { x: 0, y: 0, z: 0 };
	for (const axis of move.value.axes) {
		const letter = axis.letter.toLowerCase();
		if (letter === "x" || letter === "y" || letter === "z") {
			position[letter] = axis.userPosition ?? 0;
		}
	}
	return position;
});

watch(toolPosition, (to) => {
	if (showTool.value && followingJob.value) {
		viewer?.setNozzlePosition(to.x, to.y, to.z, false);
	}
});

// Live job following: mirror the print head's file position into the viewer while tracking is on
watch(filePosition, (newValue) => {
	if (followingJob.value) {
		scrubPosition.value = newValue;
		viewer?.updateFilePosition(newValue);
	}
});

// A job that ends clears its file position, and the filePosition watcher above runs first (watchers
// fire in creation order), which would leave the finished job rendered at 0% - show the whole file
// instead. visualizingCurrentJob covers the job stopping as well as the loaded file changing
watch(visualizingCurrentJob, (newValue) => {
	if (!newValue && followingJob.value) {
		followingJob.value = false;
		showWholeFile();
	}
});

watch(selectedFile, () => {
	showObjectSelection.value = false;
});

watch(loading, (to) => {
	if (!to) {
		loadingMessage.value = "";
	}
});

// #endregion
</script>
