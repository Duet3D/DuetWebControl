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

.btn-toggle {
	flex-direction: column;
}

.primary-container {
	position: relative;
	width: 100%;
	height: 100%;
	/*background-color: green;*/
}

.v-input--checkbox {
	margin: 0;
	padding-left: 12px;
}

.v-input--switch {
	margin: 0;
	padding-left: 12px;
}

.viewer-box {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	/*background-color: yellow;*/
}

.full-screen {
	position: fixed;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
	z-index: 10;
}

.full-screen-icon {
	height: 40px;
	width: 40px;
}

.drawer-zindex {
	z-index: 20;
}
.button-container {
	position: absolute;
	top: 5px;
	left: 5px;
	-webkit-transition-duration: 0.3s;
	-moz-transition-duration: 0.3s;
	-o-transition-duration: 0.3s;
	transition-duration: 0.3s;
}

.button-container-drawer {
	left: 355px !important;
}
.emergency-button-placement {
	position: absolute;
	top: 14px;
	right: 16px;
	z-index: 999;
}

.emergency-button-placement-codeview {
	position: absolute;
	top: 14px;
	right: 30%;
	z-index: 999;
}

.viewer-box >>> #scene-explorer-host {
	position: absolute !important;
	left: calc(100% - 605px);
	width: 300px;
	top: 0px;
	z-index: 50 !important;
}

.loading-progress {
	position: absolute;
	width: 50%;
	left: 0px;
	margin-left: 25%;
	top: 5px;
	z-index: 19 !important;
}

.scrubber {
	position: absolute;
	left: 5%;
	right: 5%;
	bottom: 15px;
	z-index: 19 !important;
}
.scrubber-codeview {
	position: absolute;
	left: 5%;
	right: 35%;
	bottom: 15px;
	z-index: 19 !important;
}


.scrubber-sm{
	position: absolute;
	left: 5%;
	right: 5%;
	bottom: 70px;
	z-index: 19 !important;
}


.scrubber-sm-codeview{
	position: absolute;
	left: 5%;
	right: 35%;
	bottom: 70px;
	z-index: 19 !important;
}

/* Transitions lag when trying to show loading progress */
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
	<div class="primary-container mt-2" ref="primarycontainer" v-resize="resize">
		<div :class="{ 'full-screen': fullscreen }" class="viewer-box">
			<div :class="emergencyButtonClass" v-show="fullscreen">
				<code-btn :code="'M112\nM999'" :log="false" :title="$t('button.emergencyStop.title')" color="error">
					<v-icon>mdi-flash</v-icon>
				</code-btn>
			</div>
			<code-stream :shown="viewGCode" :is-simulating="scrubPlaying" :document="fileData" :class="codeViewClass" :currentline="scrubPosition" @changed="scrubPositionChanged"></code-stream>
			<canvas :title="hoverLabel" :class="viewerClass" ref="viewerCanvas"></canvas>
			<fs-overlay :class="[viewerClass, 'fsoverlay']" v-show="fullscreen && showOverlay" :viewgcode="viewGCode"></fs-overlay>
			<div class="loading-progress">
				<v-progress-linear :value="loadingProgress" class="disable-transition" height="15" rounded v-show="loading">{{loadingProgress}}% {{loadingMessage}}</v-progress-linear>
			</div>
			<div :class="{ 'button-container-drawer': drawer }" class="button-container">
				<v-btn :title="$t('plugins.gcodeViewer.fullscreen')" @click="toggleFullScreen" class="full-screen-icon mb-2" color="secondary" small>
					<v-icon>{{ fullscreen ? 'mdi-window-restore' : 'mdi-window-maximize' }}</v-icon>
				</v-btn>
				<br />
				<v-btn :title="$t('plugins.gcodeViewer.showConfiguration')" @click="drawer = !drawer" class="toggle-menu-button-close mb-10" color="secondary" small>
					<v-icon>mdi-cog</v-icon>
				</v-btn>
				<br />
				<v-btn :title="$t('plugins.gcodeViewer.loadCurrentJob.title')" @click="loadRunningJob" class="toggle-menu-button-close mb-10" color="secondary" small v-show="!(!isJobRunning || loading || visualizingCurrentJob)">
					<v-icon>mdi-printer-3d</v-icon>
				</v-btn>
				<br />
				<v-btn :title="$t('plugins.gcodeViewer.cancelLoad')" @click="cancelLoad" class="toggle-menu-button-close" color="warning" small v-show="loading">
					<v-icon color="red">mdi-cancel</v-icon>
				</v-btn>
			</div>
			<v-navigation-drawer :permanent="drawer" absolute v-model="drawer" width="350px">
				<v-card>
					<v-btn :title="$t('plugins.gcodeViewer.resetCamera.title')" @click="reset" block color="primary">
						<v-icon class="mr-2">mdi-camera</v-icon>
						{{ $t('plugins.gcodeViewer.resetCamera.caption') }}
					</v-btn>
					<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.reloadView.title') " @click="reloadviewer" block class="mt-2" color="primary">
						<v-icon class="mr-2">mdi-reload-alert</v-icon>
						{{ $t('plugins.gcodeViewer.reloadView.caption') }}
					</v-btn>
					<v-btn :disabled="!isJobRunning || loading || visualizingCurrentJob" :title="$t('plugins.gcodeViewer.loadCurrentJob.title')" @click="loadRunningJob" block class="mt-2" color="secondary">
						<v-icon class="mr-2">mdi-printer-3d</v-icon>
						{{ $t('plugins.gcodeViewer.loadCurrentJob.caption') }}
					</v-btn>
					<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.unloadGCode.title')" @click="clearScene" block class="mt-2" color="primary">
						<v-icon class="mr-2">mdi-video-3d-off</v-icon>
						{{ $t('plugins.gcodeViewer.unloadGCode.caption') }}
					</v-btn>
					<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.loadLocalGCode.title')" @click="chooseFile" block class="mt-2" color="primary">
						<v-icon>mdi-file</v-icon>
						{{ $t('plugins.gcodeViewer.loadLocalGCode.caption') }}
					</v-btn>
					<input :accept="'.g,.gcode,.gc,.gco,.nc,.ngc,.tap'" @change="fileSelected" hidden multiple ref="fileInput" type="file" />
					<v-switch :disabled="!canCancelObject" :label="jobSelectionLabel" :title="$t('plugins.gcodeViewer.showObjectSelection.title')" class="mt-4" v-model="showObjectSelection"></v-switch>
					<v-switch :label="$t('plugins.gcodeViewer.showCursor')" v-model="showCursor"></v-switch>
					<v-switch :label="$t('plugins.gcodeViewer.showTravels')" v-model="showTravelLines"></v-switch>
					<v-switch :label="$t('plugins.gcodeViewer.viewGCode')" v-model="viewGCode"></v-switch>
				</v-card>
				<v-expansion-panels>
					<v-expansion-panel @click="scrollIntoView">
						<v-expansion-panel-header :title="$t('plugins.gcodeViewer.renderQuality.title')">
							<v-icon class="mr-2">mdi-checkerboard</v-icon>
							<strong>{{$t('plugins.gcodeViewer.renderQuality.caption')}}</strong>
						</v-expansion-panel-header>
						<v-expansion-panel-content eager>
							<v-btn-toggle block class="btn-toggle d-flex" exclusive v-model="renderQuality">
								<v-btn :disabled="loading" :value="1" block>{{$t('plugins.gcodeViewer.sbc')}}</v-btn>
								<v-btn :disabled="loading" :value="2" block>{{$t('plugins.gcodeViewer.low')}}</v-btn>
								<v-btn :disabled="loading" :value="3" block>{{$t('plugins.gcodeViewer.medium')}}</v-btn>
								<v-btn :disabled="loading" :value="4" block>{{$t('plugins.gcodeViewer.high')}}</v-btn>
								<v-btn :disabled="loading" :value="5" block>{{$t('plugins.gcodeViewer.ultra')}}</v-btn>
								<v-btn :disabled="loading" :value="6" block>{{$t('plugins.gcodeViewer.max')}}</v-btn>
							</v-btn-toggle>
							<v-checkbox :label="$t('plugins.gcodeViewer.useHQRendering')" class="mt-4" v-model="useHQRendering" />
							<v-checkbox :label="$t('plugins.gcodeViewer.forceLineRendering')" v-model="forceWireMode"></v-checkbox>
							<v-checkbox :label="$t('plugins.gcodeViewer.perimeterOnly')" v-model="perimeterOnly"></v-checkbox>
							<v-checkbox :label="$t('plugins.gcodeViewer.progressMode')" v-model="progressMode"></v-checkbox>
							<v-checkbox :label="$t('plugins.gcodeViewer.transparency')" v-model="vertexAlpha"></v-checkbox>
							<v-slider v-if="vertexAlpha" v-model="transparencyPercent" min="1" max="100"></v-slider>
							<v-checkbox :label="$t('plugins.gcodeViewer.useSpecular')" v-model="specular"></v-checkbox>
						</v-expansion-panel-content>
					</v-expansion-panel>
					<v-expansion-panel @click="scrollIntoView">
						<v-expansion-panel-header :title="$t('plugins.gcodeViewer.extruders.title')">
							<v-icon class="mr-2">mdi-printer-3d-nozzle</v-icon>
							<strong>{{$t('plugins.gcodeViewer.extruders.caption')}}</strong>
						</v-expansion-panel-header>
						<v-expansion-panel-content>
							<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.reloadView.title')" @click="reloadviewer" block class="mb-2" color="primary">{{$t('plugins.gcodeViewer.reloadView.caption')}}</v-btn>
							<v-card :key="index" v-for="(extruder, index) in toolColors">
								<v-card-title>
									<h3>{{$t('plugins.gcodeViewer.tool', [index])}}</h3>
								</v-card-title>
								<v-card-text>
									<gcodeviewer-color-picker :editcolor="extruder" @updatecolor="value => {updateColor(index, value);}"></gcodeviewer-color-picker>
								</v-card-text>
							</v-card>
							<v-card>
								<v-btn @click="resetExtruderColors" block class="mt-4" color="warning">{{$tc('plugins.gcodeViewer.resetColor', toolColors.length)}}</v-btn>
							</v-card>
						</v-expansion-panel-content>
					</v-expansion-panel>
					<v-expansion-panel @click="scrollIntoView">
						<v-expansion-panel-header :title="$t('plugins.gcodeViewer.renderMode.title')">
							<v-icon class="mr-2">mdi-palette</v-icon>
							<strong>{{$tc('plugins.gcodeViewer.renderMode.caption', 2)}}</strong>
						</v-expansion-panel-header>
						<v-expansion-panel-content>
							<v-card>
								<h4>{{$tc('plugins.gcodeViewer.renderMode.caption', 2)}}</h4>
								<v-btn-toggle block class="btn-toggle d-flex" exclusive v-model="colorMode">
									<v-btn :disabled="loading" :value="0" block>{{$t("plugins.gcodeViewer.color")}}</v-btn>
									<v-btn :disabled="loading" :value="1" block>{{$t('plugins.gcodeViewer.feedrate')}}</v-btn>
									<v-btn :disabled="loading" :value="2" block>{{$t('plugins.gcodeViewer.feature')}}</v-btn>
								</v-btn-toggle>
								<v-checkbox class="mt-3" v-model="g1AsExtrusion" :label="$t('plugins.gcodeViewer.g1AsExtrusion')"></v-checkbox>
								<h4>{{$t('plugins.gcodeViewer.minFeedrate')}}</h4>
								<v-slider :max="500" :min="5" v-model="minColorRate" thumb-label></v-slider>
								<h4>{{$t('plugins.gcodeViewer.maxFeedrate')}}</h4>
								<v-slider :max="500" :min="5" v-model="maxColorRate" thumb-label></v-slider>
							</v-card>
							<v-card>
								<v-card-title>
									<h4>{{$t('plugins.gcodeViewer.minFeedrateColor')}}</h4>
								</v-card-title>
								<v-card-text>
									<gcodeviewer-color-picker :editcolor="minFeedColor" @updatecolor="value => updateMinFeedColor(value)"></gcodeviewer-color-picker>
								</v-card-text>
							</v-card>
							<v-card>
								<v-card-title>
									<h4>{{$t('plugins.gcodeViewer.maxFeedrateColor')}}</h4>
								</v-card-title>
								<v-card-text>
									<gcodeviewer-color-picker :editcolor="maxFeedColor" @updatecolor="value => updateMaxFeedColor(value)"></gcodeviewer-color-picker>
								</v-card-text>
							</v-card>
							<v-btn :disabled="loading" :title="$t('plugins.gcodeViewer.reloadView.title')" @click="reloadviewer" block class="mb-2" color="primary">{{$t('plugins.gcodeViewer.reloadView.caption')}}</v-btn>
						</v-expansion-panel-content>
					</v-expansion-panel>
					<v-expansion-panel @click="scrollIntoView">
						<v-expansion-panel-header :title="$t('plugins.gcodeViewer.progress.title')">
							<v-icon class="mr-2">mdi-progress-clock</v-icon>
							<strong>{{$t('plugins.gcodeViewer.progress.caption')}}</strong>
						</v-expansion-panel-header>
						<v-expansion-panel-content>
							<v-card>
								<div>{{$t('plugins.gcodeViewer.topClipping')}}</div>
								<v-slider :max="maxHeight" :min="minHeight" step="0.1" thumb-label thumb-size="24" v-model="sliderHeight"></v-slider>
								<div>{{$t('plugins.gcodeViewer.bottomClipping')}}</div>
								<v-slider :max="maxHeight" :min="minHeight" step="0.1" thumb-label thumb-size="24" v-model="sliderBottomHeight"></v-slider>
							</v-card>
							<v-card>
								<v-card-title>{{$t('plugins.gcodeViewer.progressColor')}}</v-card-title>
								<v-card-text>
									<gcodeviewer-color-picker :editcolor="progressColor" @updatecolor="value => updateProgressColor(value)"></gcodeviewer-color-picker>
								</v-card-text>
							</v-card>
						</v-expansion-panel-content>
					</v-expansion-panel>
					<v-expansion-panel @click="scrollIntoView">
						<v-expansion-panel-header>
							<v-icon class="mr-2">mdi-cog</v-icon>
							<strong>{{$t('plugins.gcodeViewer.settings')}}</strong>
						</v-expansion-panel-header>
						<v-expansion-panel-content>
							<v-card>
								<v-card-title>{{$t('plugins.gcodeViewer.background')}}</v-card-title>
								<v-card-text>
									<gcodeviewer-color-picker :editcolor="backgroundColor" @updatecolor="value => updateBackground(value)"></gcodeviewer-color-picker>
								</v-card-text>
							</v-card>
							<v-card>
								<v-card-title>{{$t('plugins.gcodeViewer.bedRenderMode')}}</v-card-title>
								<v-card-text>
									<v-btn-toggle class="d-flex flex-column" v-model="bedRenderMode">
										<v-btn :value="0" block>{{$t('plugins.gcodeViewer.bed')}}</v-btn>
										<v-btn :value="1" block>{{$t('plugins.gcodeViewer.volume')}}</v-btn>
									</v-btn-toggle>
									<br />
									<gcodeviewer-color-picker :editcolor="bedColor" @updatecolor="value => updateBedColor(value)"></gcodeviewer-color-picker>
								</v-card-text>
							</v-card>
							<v-card>
								<v-card-text>
									<v-checkbox :label="$t('plugins.gcodeViewer.showFSOverlay')" v-model="showOverlay"></v-checkbox>
									<v-checkbox :label="$t('plugins.gcodeViewer.showAxes')" v-model="showAxes"></v-checkbox>
									<v-checkbox :label="$t('plugins.gcodeViewer.showObjectLabels')" v-model="showObjectLabels"></v-checkbox>
									<v-checkbox :label="$t('plugins.gcodeViewer.showWorkplace')" v-model="showWorkplace"></v-checkbox>
									<v-switch :label="$t('plugins.gcodeViewer.cameraInertia')" v-model="cameraInertia"></v-switch>
									<v-switch :label="$t('plugins.gcodeViewer.zBelt')" v-model="zBelt"></v-switch>
									<v-text-field type="number"  :label="$t('plugins.gcodeViewer.zBeltAngle')" v-model="zBeltAngle"></v-text-field>
								</v-card-text>
							</v-card>
						</v-expansion-panel-content>
					</v-expansion-panel>
				</v-expansion-panels>
			</v-navigation-drawer>
			<div :class="[{ 'button-container-drawer': drawer }, scrubberClass]" v-show="!visualizingCurrentJob && scrubFileSize > 0">
				<v-row class="scrubber-row">
					<v-col cols="10" md="6">
						<v-slider :hint="scrubPosition + '/' + scrubFileSize" :max="scrubFileSize" dense min="0" persistent-hint v-model="scrubPosition " @start="scrubStart" @end="scrubEnd" @change="scrubPositionChanged"></v-slider>
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
						<v-btn-toggle dense mandatory rounded v-model="scrubSpeed">
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
		<v-dialog max-width="300" v-model="objectDialogData.showDialog">
			<v-card>
				<v-card-title class="headline">
					<v-icon class="mr-2">{{ objectDialogData.info.cancelled ? 'mdi-reload' : 'mdi-cancel' }}</v-icon>
					{{ objectDialogData.info.cancelled ? 'Resume' : 'Cancel' }} Object
				</v-card-title>
				<v-card-text>{{ objectDialogData.info.name }}</v-card-text>
				<v-card-actions>
					<v-row no-gutters>
						<v-col cols="6">
							<v-btn @click="objectDialogCancelObject" block color="primary">Ok</v-btn>
						</v-col>
						<v-col cols="6">
							<v-btn @click="objectDialogData.showDialog = false" block color="error">Cancel</v-btn>
						</v-col>
					</v-row>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<script>
'use strict';

import { KinematicsName } from '@duet3d/objectmodel';
import gcodeViewer from '@sindarius/gcodeviewer';
import { mapActions, mapState } from 'vuex';

import { setPluginData, PluginDataType } from '@/store';
import { isPrinting } from '@/utils/enums';
import Path from '@/utils/path';
import { Vector3 } from '@babylonjs/core/Maths/math';

let viewer;

export default {
	data: function () {
		return {
			drawer: false,
			backgroundColor: '#000000FF',
			progressColor: '#FFFFFFFF',
			viewerHeight: '400px',
			testValue: '',
			loading: false,
			testData: '',
			showCursor: false,
			showTravelLines: false,
			selectedFile: '',
			nthRow: 1,
			renderQuality: 1,
			debugVisible: false,
			maxHeight: 0,
			minHeight: 0,
			sliderHeight: 0,
			sliderBottomHeight: 0,
			forceWireMode: false,
			vertexAlpha: false,
			showObjectSelection: false,
			objectDialogData: {
				showDialog: false,
				info: {},
			},
			hoverLabel: '',
			bedRenderMode: 0,
			showAxes: true,
			showObjectLabels: true,
			fullscreen: false,
			bedColor: '',
			colorMode: 0,
			minColorRate: 20,
			maxColorRate: 60,
			maxFileFeedRate: 0,
			minFeedColor: '#0000FF',
			maxFeedColor: '#FF0000',
			cameraInertia: true,
			loadingProgress: 0,
			loadingMessage: '',
			showOverlay: true,
			//File scrubber
			scrubPosition: 0,
			scrubFileSize: 0,
			scrubPlaying: false,
			scrubInterval: null,
			scrubSpeed: 1,
			colorDebounce: null,
			resizeDebounce: null,
			codeView: false,
			fileData: "",
			perimeterOnly: false,
			transparencyPercent: 50,
			transparencyDebounce: null,
			progressMode: false
		};
	},
	computed: {
		...mapState('machine/model', ['job', 'move', 'state']),
		...mapState('machine/cache', {
			pluginCache: (state) => state.plugins.GCodeViewer,
		}),
		isJobRunning: (state) => isPrinting(state.state.status),
		visualizingCurrentJob: function (state) {
			try {
				return state.job.file.fileName === this.selectedFile && this.isJobRunning;
			} catch {
				return false;
			}
		},
		filePosition: (state) => state.job.filePosition,
		fileSize: (state) => state.job.file.size,
		kinematicsName: (state) => state.move.kinematics.name,
		isDelta() {
			return this.kinematicsName === KinematicsName.delta || this.kinematicsName === KinematicsName.rotaryDelta;
		},
		canCancelObject() {
			try {
				if (!this.isJobRunning || this.job.build?.objects?.length <= 0) {
					return false;
				}
				return this.visualizingCurrentJob;
			} catch {
				return false;
			}
		},
		jobSelectionLabel() {
			var selectionLabel = this.$t('plugins.gcodeViewer.showObjectSelection.caption');
			if (this.canCancelObject && this.job.build.objects) {
				selectionLabel += ' (' + this.job.build.objects.length + ')';
			}
			return selectionLabel;
		},
		toolColors: {
			get() {
				return this.pluginCache.toolColors;
			},
			set(value) {
				setPluginData('GCodeViewer', PluginDataType.machineCache, 'toolColors', value);
			},
		},
		useHQRendering: {
			get() {
				return this.pluginCache.useHQRendering;
			},
			set(value) {
				setPluginData('GCodeViewer', PluginDataType.machineCache, 'useHQRendering', value);
			},
		},
		specular: {
			get(){
				return this.pluginCache.useSpecular;
			},
			set(value){
				setPluginData('GCodeViewer', PluginDataType.machineCache, 'useSpecular', value);
			}
		},
		g1AsExtrusion: {
			get(){
				return this.pluginCache.g1AsExtrusion;
			},
			set(value){
				setPluginData('GCodeViewer', PluginDataType.machineCache, 'g1AsExtrusion', value);
			}
		},
		viewGCode: {
			get() {
				return this.pluginCache.viewGCode;
			},
			set(value) {
				setPluginData('GCodeViewer', PluginDataType.machineCache, 'viewGCode', value);
				if(value){
					this.fileData = viewer.fileData;
				} else{ 
					this.fileData = ""
				}
				this.resize();
			},
		},
		zBelt: {
			get() {
				return this.pluginCache.zBelt;
			},
			set(value) { 
				setPluginData('GCodeViewer', PluginDataType.machineCache, 'zBelt', value);

			}
		},
		zBeltAngle: {
			get() {
				return this.pluginCache.zBeltAngle;
			},
			set(value) { 
				setPluginData('GCodeViewer', PluginDataType.machineCache, 'zBeltAngle', value);
			}
		},
		viewerClass() {
			this.$nextTick(() => {
				this.resize();
			});
			return this.viewGCode ? 'babylon-canvas-codeview' : 'babylon-canvas';
		},
		scrubberClass() {
			if( this.$vuetify.breakpoint.mdAndDown)
			{
				//scrubber-sm
				return this.viewGCode ? 'scrubber-sm-codeview' : 'scrubber-sm';

			}
			else{
				//scrubber
				return this.viewGCode? 'scrubber-codeview' : 'scrubber';
			}
		},
		codeViewClass() {
			return this.$vuetify.breakpoint.mdAndDown ? 'codeview-sm' : 'codeview'
		},
		emergencyButtonClass() {
			return this.viewGCode ? 'emergency-button-placement-codeview' : 'emergency-button-placement'
		},
		workplaceOffsets() { 
			let offsets = [];
			try {
				for (let idx = 0; idx < this.move.axes.length; idx++){
					let axis = this.move.axes[idx];
					offsets.push(...axis.workplaceOffsets)
				}
			}
			catch  {
				
			}
			return offsets;
		},
		currentWorkplace() {
			return this.move.workplaceNumber;
		},
		showWorkplace: {
				get() {
				return this.pluginCache.showWorkplace;
			},
			set(value) { 
				setPluginData('GCodeViewer', PluginDataType.machineCache, 'showWorkplace', value);
			}
		}
	},
	async mounted() {
		viewer = new gcodeViewer(this.$refs.viewerCanvas);
		viewer.fileData = "";
		await viewer.init();
	
		viewer.simulationMultiplier = 1;
		viewer.buildObjects.objectCallback = this.objectSelectionCallback;
		viewer.buildObjects.labelCallback = (label) => {
			if (this.showObjectSelection) {
				this.hoverLabel = label;
			} else {
				this.hoverLabel = '';
			}
		};
		this.showObjectLabels = viewer.buildObjects.showLabel;

		if (this.move.axes) {
			for (var axesIdx in this.move.axes) {
				let axes = this.move.axes[axesIdx];
				if ('XYZ'.includes(axes.letter)) {
					var letter = axes.letter.toLowerCase();
					viewer.bed.buildVolume[letter].min = axes.min;
					viewer.bed.buildVolume[letter].max = axes.max;
				}
			}
			viewer.bed.commitBedSize();
		}

		this.cameraInertia = viewer.cameraInertia;

		viewer.bed.setDelta(this.isDelta);
		this.bedRenderMode = viewer.bed.renderMode;
		this.bedColor = viewer.bed.getBedColor();
		this.showAxes = viewer.axes.visible;
		viewer.gcodeProcessor.useSpecularColor(this.specular);

		this.colorMode = viewer.gcodeProcessor.colorMode;
		this.minFeedColor = viewer.gcodeProcessor.minFeedColorString;
		this.maxFeedColor = viewer.gcodeProcessor.maxFeedColorString;
		this.minColorRate = viewer.gcodeProcessor.minColorRate / 60;
		this.maxColorRate = viewer.gcodeProcessor.maxColorRate / 60;
		this.forceWireMode = viewer.gcodeProcessor.forceWireMode;
		this.showCursor = localStorage.getItem('showCursor') === 'true';

		if (viewer.lastLoadFailed()) {
			this.renderQuality = 1;
			viewer.updateRenderQuality(1);
			this.$makeNotification('warning', 'GCode Viewer', this.$t('plugins.gcodeViewer.renderFailed'), 5000);
			viewer.clearLoadFlag();
		}
		viewer.setCursorVisiblity(this.showCursor);
		this.renderQuality = viewer.renderQuality;
		this.backgroundColor = viewer.getBackgroundColor();
		this.progressColor = viewer.getProgressColor();
		viewer.gcodeProcessor.useHighQualityExtrusion(this.useHQRendering);
		viewer.gcodeProcessor.loadingProgressCallback = (progress, message) => {
			this.loadingProgress = Math.ceil(progress * 100);
			this.loadingMessage = message ?? '';
		};
		viewer.simulationUpdatePosition = (position) => {
			this.scrubPosition = position - 2;
		};
		viewer.simulationStopped = () => {
			this.scrubPlaying = false;
		};
		this.viewModelEvent = async (path) => {
			this.selectedFile = path;

			try {
				let blob = await this.machineDownload({
					filename: Path.combine(path),
					type: 'text',
				});
				this.loading = true;
				this.preLoadSettings();
				await viewer.processFile(blob);
				if(this.viewGCode){
					this.fileData = viewer.fileData;
				}
				this.scrubFileSize = viewer.fileSize;
				viewer.gcodeProcessor.setLiveTracking(this.visualizingCurrentJob);
				this.setGCodeValues();
			} finally {
				this.loading = false;
			}
		};

		this.$root.$on('view-3d-model', this.viewModelEvent);

		this.$nextTick(() => {
			this.updateTools();
			this.updateWorkplaces();
		});

		window.addEventListener('keyup', (e) => {
			var key = e.key || e.keyCode;
			if (key === 'Escape' || key === 'Esc' || key === 27) {
				this.fullscreen = false;
				this.$nextTick(() => {
					viewer.resize();
				});

			}
		});

		//watch for resizing events
		window.addEventListener('resize', () => {
			this.$nextTick(() => {
				this.resize();
			});
		});
	},
	beforeDestroy() {
		this.$root.$off('view-3d-model', this.viewModelEvent);
	},
	methods: {
		...mapActions('machine', {
			machineDownload: 'download',
			sendCode: 'sendCode',
		}),

		simulatePlay() {
			if (this.scrubPlaying) {
				viewer.stopSimulation();
			}
			else {
				viewer.startSimulation();
			}
			this.scrubPlaying = viewer.simulation;
		},
		scrubPositionChanged(value) {
			let viewerState = viewer.simulation;
			viewer.simulation = false;

			this.$nextTick(() => {
				this.scrubPosition = value;
				viewer.gcodeProcessor.updateFilePosition(value);
				viewer.simulateToolPosition();
				viewer.simulation = viewerState;
			});
		},
		scrubStart() {
			viewer.simulation = false;
		},
		scrubEnd(val) {
			viewer.simulation = this.scrubPlaying;
		},
		updateColor(index, value) {
			this.toolColors[index] = value;
			viewer.gcodeProcessor.updateTool(value, 0.4, index);
			if (this.colorDebounce) {
				clearTimeout(this.colorDebounce);
			}
			this.colorDebounce = setTimeout(() => {
				setPluginData('GCodeViewer', PluginDataType.machineCache, 'toolColors', this.toolColors);
				viewer.gcodeProcessor.forceRedraw();
			}, 200);
		},
		updateBackground(value) {
			this.backgroundColor = value;
			viewer.setBackgroundColor(this.backgroundColor);
		},
		updateProgressColor(value) {
			this.progressColor = value;
			viewer.setProgressColor(value);
		},
		updateMinFeedColor(value) {
			viewer.gcodeProcessor.updateMinFeedColor(value);
		},
		updateMaxFeedColor(value) {
			viewer.gcodeProcessor.updateMaxFeedColor(value);
		},
		updateBedColor(value) {
			this.bedColor = value;
			viewer.bed.setBedColor(value);
		},
		resize() {

			if(this.resizeDebounce){
				clearTimeout(this.resizeDebounce);
			}
			this.resizeDebounce = setTimeout(() => {
				let contentArea = getComputedStyle(document.getElementsByClassName('v-toolbar__content')[0]);
				let globalContainer =  getComputedStyle(document.getElementById('global-container'));
				let primaryContainer = getComputedStyle(this.$refs.primarycontainer);
				let contentAreaHeight = parseInt(contentArea.height) + parseInt(contentArea.paddingTop) + parseInt(contentArea.paddingBottom);
				let globalContainerHeight = this.$vuetify.breakpoint.smAndDown ? 0 : parseInt(globalContainer.height) + parseInt(globalContainer.paddingTop) + parseInt(globalContainer.paddingBottom);
				let viewerHeight = window.innerHeight - contentAreaHeight - globalContainerHeight - parseInt(primaryContainer.marginTop);
				this.$refs.primarycontainer.style.height = (viewerHeight >= 300 ? viewerHeight : 300) + 'px';
				if (viewer) {
					viewer.resize();
				}
			}, 500);
		},
		reset() {
			if (viewer) {
				viewer.resetCamera();
			}
		},
		async loadRunningJob() {
			viewer.simulation = false;
			if (this.selectedFile != this.job.file.fileName) {
				this.selectedFile = '';
				viewer.gcodeProcessor.setLiveTracking(false);
				viewer.clearScene(true);
			}
			this.selectedFile = this.job.file.fileName;

			try {
				let blob = await this.machineDownload({
					filename: this.job.file.fileName,
					type: 'text',
				});

				this.loading = true;
				viewer.gcodeProcessor.setLiveTracking(true);
				viewer.gcodeProcessor.updateForceWireMode(this.forceWireMode);
				viewer.gcodeProcessor.useHighQualityExtrusion(this.useHQRendering);
				this.preLoadSettings();
				await viewer.processFile(blob);
				if(this.viewGCode){
					this.fileData = viewer.fileData;
				}
				this.scrubFileSize = viewer.fileSize;;
				this.setGCodeValues();
				viewer.buildObjects.loadObjectBoundaries(this.job.build.objects); //file is loaded lets load the final heights
			} finally {
				viewer.gcodeProcessor.updateFilePosition(0);
				viewer.gcodeProcessor.forceRedraw();
				this.loading = false;
			}
		},
		resetExtruderColors() {
			this.toolColors = ['#00FFFF', '#FF00FF', '#FFFF00', '#000000', '#FFFFFF'];
			this.updateTools();
			viewer.gcodeProcessor.forceRedraw();
		},
		async reloadviewer() {
			if (this.loading) {
				return;
			}
			this.loading = true;
			this.preLoadSettings();		

			if (viewer.fileData.length > 0) {
				await viewer.reload();
			}
			this.loading = false;
			
			viewer.setCursorVisiblity(this.showCursor);
			viewer.toggleTravels(this.showTravelLines);
			this.setGCodeValues();
			
			viewer.gcodeProcessor.forceRedraw();
			viewer.gcodeProcessor.updateFilePosition(this.scrubPosition);

			try {
				viewer.buildObjects.loadObjectBoundaries(this.job.build.objects);
			} catch {
				//console.warn("No objects");
			}
		},
		clearScene() {
			this.selectedFile = '';
			viewer.clearScene(true);
		},
		objectSelectionCallback(selectedObject) {
			this.objectDialogData.showDialog = true;
			this.objectDialogData.info = selectedObject;
		},
		async objectDialogCancelObject() {
			this.objectDialogData.showDialog = false;
			let action = this.objectDialogData.info.cancelled ? 'U' : 'P';
			await this.sendCode(`M486 ${action}${this.objectDialogData.info.index}`);
			this.objectDialogData.info = {};
		},
		chooseFile() {
			if (!this.isBusy) {
				this.$refs.fileInput.click();
			}
		},
		setGCodeValues() {
			if(!this.g1AsExtrusion){
				this.maxHeight =  this.zBelt ? 500 : viewer.getMaxHeight();
				this.minHeight =  viewer.getMinHeight();
			}
			else{
				this.maxHeight = 100000;
				this.minHeight = -100000;
			}
			this.sliderHeight = this.maxHeight;
			this.loading = false;
			this.maxFileFeedRate = viewer.gcodeProcessor.maxFeedRate;
			this.sliderBottomHeight = this.minHeight < 0 ? this.minHeight : 0;
		},
		preLoadSettings(){
			viewer.gcodeProcessor.updateForceWireMode(this.forceWireMode);
			viewer.gcodeProcessor.setLiveTracking(this.visualizingCurrentJob);
			viewer.gcodeProcessor.useHighQualityExtrusion(this.useHQRendering);
			viewer.gcodeProcessor.perimeterOnly = this.perimeterOnly;
			viewer.gcodeProcessor.currentWorkplace = this.currentWorkplace;
			viewer.gcodeProcessor.progressMode = this.progressMode;
			viewer.setZBelt(this.zBelt, this.zBeltAngle);
			if(this.g1AsExtrusion){
				this.renderQuality = 5;
				viewer.updateRenderQuality(5);
				viewer.gcodeProcessor.g1AsExtrusion = true;
				//viewer.gcodeProcessor.updateForceWireMode(true);
				viewer.setZClipPlane(10000000,-10000000);
			}
		},
		async fileSelected(e) {
			const reader = new FileReader();
			reader.addEventListener('load', async (event) => {
				this.preLoadSettings();
				const blob = event.target.result;
				// Do something with result
				await viewer.processFile(blob);
				if(this.viewGCode){
					this.fileData = viewer.fileData;
				}
				this.scrubFileSize = viewer.fileSize;
				this.setGCodeValues();
			});
			this.loading = true;
			reader.readAsText(e.target.files[0]);
			e.target.value = '';
		},
		toggleFullScreen() {
			this.fullscreen = !this.fullscreen;
			this.$nextTick(() => {
				viewer.resize();
			});
		},

		displayMaxFileFeedRate() {
			if (this.maxFileFeedRate > 0) return `(${this.maxFileFeedRate / 60})`;
		},
		cancelLoad() {
			viewer.gcodeProcessor.cancelLoad = true;
		},
		scrollIntoView(event) {
			setTimeout(() => {
				event.target.scrollIntoView(true);
			}, 250);
		},
		fastForward() {
			viewer.stopSimulation();
			this.scrubPlaying = false;
			this.scrubPosition = this.scrubFileSize;
			viewer.gcodeProcessor.updateFilePosition(this.scrubFileSize);
			
		},
		updatePosition(){

		},
		updateWorkplaces() {
				let axesLetterIdx = {};
				for (var axesIdx in this.move.axes) {
					let axes = this.move.axes[axesIdx];
					axesLetterIdx[axes.letter] = Number(axesIdx);
				}
				//Reload the workplace offsets
				viewer.gcodeProcessor.workplaceOffsets = [];
				for (let idx = 0; idx < 9; idx++) {
					try {
						let x = this.move.axes[axesLetterIdx['X']].workplaceOffsets[idx];
						let y = this.move.axes[axesLetterIdx['Y']].workplaceOffsets[idx]
						let z = this.move.axes[axesLetterIdx['Z']].workplaceOffsets[idx]
						viewer.gcodeProcessor.workplaceOffsets.push(new Vector3(x, y, z));
					}
					catch{
						
					}
				}
				viewer.setWorkplaceVisiblity(this.showWorkplace);
		},
		updateTools() {
			viewer.gcodeProcessor.resetTools();
			for (let idx = 0; idx < this.toolColors.length; idx++) {
				viewer.gcodeProcessor.addTool(this.toolColors[idx], 0.4); //hard code the nozzle size for now.
			}
		},		
	},
	activated() {
		viewer.pause = false;
		this.resize();
	},
	deactivated() {
		viewer.pause = true;
	},
	watch: {
		'move': {
			handler(newValue) {
				var newPosition = newValue.axes.map((item) => ({
					axes: item.letter,
					position: item.userPosition + item.workplaceOffsets[this.currentWorkplace],
				}));
				viewer.updateToolPosition(newPosition);
			},
			deep: true,
		},
		'showCursor': function (newValue) {
			viewer.setCursorVisiblity(newValue);
			localStorage.setItem('showCursor', newValue);
		},
		'showTravelLines': (newVal) => {
			viewer.toggleTravels(newVal);
		},
		'visualizingCurrentJob': function (newValue) {
			if (newValue == false) {
				viewer.gcodeProcessor.doFinalPass();
			}
		},
		'filePosition': function (newValue) {
			if (this.visualizingCurrentJob) {
				this.scrubPosition = newValue;
				viewer.gcodeProcessor.updateFilePosition(newValue + 1);
			}
		},
		scrubSpeed(to) {
			viewer.simulationMultiplier = to;
		},
		'nthRow': function (newValue) {
			viewer.gcodeProcessor.everyNthRow = newValue;
		},
		'renderQuality': function (newValue) {
			if (viewer.renderQuality !== newValue) {
				viewer.updateRenderQuality(newValue);
				if (!this.loading) {
					this.reloadviewer();
				}
			}
		},
		'sliderHeight': function (newValue) {
			if (this.sliderBottomHeight > newValue) this.sliderBottomHeight = newValue - 1;
			if(!this.g1AsExtrusion){
				viewer.setZClipPlane(newValue + 1, this.sliderBottomHeight);
			}
		},
		'sliderBottomHeight': function (newValue) {
			if (this.sliderHeight < newValue) this.sliderHeight = newValue + 1;
			if(!this.g1AsExtrusion){
				viewer.setZClipPlane(this.sliderHeight, newValue - 1);
			}
		},
		'vertexAlpha': function (newValue) {
			viewer.gcodeProcessor.setAlpha(newValue);
			this.reloadviewer();
		},
		'job.build.objects': {
			deep: true,
			handler(newValue) {
				if (viewer && viewer.buildObjects) {
					viewer.buildObjects.loadObjectBoundaries(newValue);
				}
			},
		},
		'showObjectSelection': function (newValue) {
			if (this.canCancelObject) {
				viewer.buildObjects.loadObjectBoundaries(this.job.build.objects);
				viewer.buildObjects.showObjectSelection(newValue);
			} else {
				this.showObjectSelection = false;
				this.hoverLabel = '';
			}
		},
		'isJobRunning': function (newValue) {
			//Need to add a check for paused...
			viewer.gcodeProcessor.setLiveTracking(newValue);
			if (!newValue) {
				viewer.gcodeProcessor.doFinalPass();
			}
		},
		'selectedFile': function () {
			this.showObjectSelection = false;
			viewer.gcodeProcessor.updateFilePosition(0);
		},
		'bedRenderMode': function (newValue) {
			viewer.bed.setRenderMode(newValue);
		},
		'isDelta': function (newValue) {
			viewer.bed.setDelta(newValue);
			viewer.resetCamera();
		},
		'showAxes': function (newValue) {
			viewer.axes.show(newValue);
		},
		'showObjectLabels': function (newValue) {
			viewer.buildObjects.showLabels(newValue);
		},
		'forceWireMode': function (newValue) {
			viewer.gcodeProcessor.updateForceWireMode(newValue);
			this.reloadviewer();
		},
		'useHQRendering': function (to) {
			viewer.gcodeProcessor.useHighQualityExtrusion(to);
		},
		'colorMode': async function (to) {
			viewer.gcodeProcessor.setColorMode(to);
			await this.reloadviewer();
		},
		'minColorRate': function (to) {
			viewer.gcodeProcessor.updateColorRate(to * 60, this.maxColorRate * 60);
		},
		'maxColorRate': function (to) {
			viewer.gcodeProcessor.updateColorRate(this.minColorRate * 60, to * 60);
		},
		'cameraInertia': function (to) {
			viewer.setCameraInertia(to);
		},
		'$route': function () {
			this.resize();
		},
		'loading': function (to) {
			if (!to) {
				this.loadingProgress = 0;
			}
		},
		'specular': function(to){
			viewer.gcodeProcessor.useSpecularColor(to);
		},
		'g1AsExtrusion': async function(to){
			viewer.gcodeProcessor.g1AsExtrusion = to;
			await this.reloadviewer();		
		},
		'zBelt': function (to) { 
			viewer.setZBelt(to, this.zBeltAngle);
			//viewer.gcodeProcessor.forceRedraw();	
		},
		'zBeltAngle': function (to) { 
			if (to < 0 || to > 90) {
				this.zBeltAngle = 45;
			}
			viewer.setZBelt(this.zBelt, to);
			//viewer.gcodeProcessor.forceRedraw();
		},
		'workplaceOffsets': {
			handler() { 
				this.updateWorkplaces();
			},
			deep: true
		},
		'currentWorkplace': function (to) {
			console.log(to)
			viewer.gcodeProcessor.currentWorkplace = to;
		},
		showWorkplace() {
			this.updateWorkplaces();
		},
		'toolColors': {
			handler() {
				this.updateTools();
			},
			deep: true
		},
		transparencyPercent(to) {
			viewer.gcodeProcessor.setTransparencyValue(to / 100);
			viewer.gcodeProcessor.forceRedraw();
		},
		async progressMode() {
			await this.reloadviewer()
		}
	},
};
</script>