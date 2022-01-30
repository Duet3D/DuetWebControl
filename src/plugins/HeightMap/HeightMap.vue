<style scoped>
.heightmap-container {
	background-color: #000;
	color: #fff;
	border-radius: 8px;
	display: flex;
}

h1 {
	width: 100%;
	align-self: center;
}

.canvas-container {
	position: relative;
	height: 100%;
	width: 100%;
	overflow: hidden;
}

.canvas-container > :first-child {
	border-radius: 4px 0 0 4px;
}

.canvas-container > :last-child {
	border-radius: 0 4px 4px 0;
}

.canvas-container > canvas {
	position: absolute;

}

.no-cursor {
	pointer-events: none;
}
</style>

<template>
	<v-row>
		<v-col cols="12" lg="auto" order="1" order-lg="0" sm="6">
			<v-card tile>
				<v-card-title class="pt-2 pb-1">
					<v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
					{{ $t('plugins.heightmap.listTitle') }}
					<v-spacer></v-spacer>
					<v-icon @click="refresh" class="ml-2">mdi-refresh</v-icon>
				</v-card-title>
				<v-card-text class="pa-0" v-show="files.length === 0">
					<v-alert :value="true" class="mb-0" type="info">
						{{ $t('plugins.heightmap.none') }}
					</v-alert>
				</v-card-text>
				<v-list :disabled="uiFrozen || !ready || loading" class="py-0">
					<v-list-item-group mandatory :value="files.indexOf(selectedFile)" color="primary">
						<v-list-item v-for="file in files" :key="file" @click="selectedFile = file">
							{{ file }}
						</v-list-item>
					</v-list-item-group>
				</v-list>
			</v-card>
		</v-col>

		<v-col :class="{ 'pa-1': $vuetify.breakpoint.xs }" class="flex-grow-1" cols="12" lg="auto" order="0" order-lg="0">
			<div class="heightmap-container" ref="container" v-resize="resize">
				<!-- h1 v-show="!ready" class="text-center">
					{{ loading ? $t('generic.loading') : (errorMessage ? errorMessage : $t('plugins.heightmap.notAvailable')) }}
				</h1-->

				<div class="canvas-container">
					<!-- v-show="ready" -->
					<canvas @mousemove="canvasMouseMove" ref="canvas"></canvas>
					<canvas class="legend" ref="legend" width="80"></canvas>
				</div>
			</div>
		</v-col>

		<v-col class="d-flex flex-column" cols="12" lg="auto" order="2" sm="6">
			<v-card class="d-flex flex-column flex-grow-1" tile>
				<v-card-title class="pt-2 pb-1">
					<v-icon class="mr-2">mdi-information</v-icon>
					{{ $t('plugins.heightmap.statistics') }}
				</v-card-title>
				<v-card-text class="d-flex flex-column flex-grow-1 justify-space-between pt-2">
					<span>{{ $t('plugins.heightmap.numPoints', [$display(numPoints, 0)]) }}</span>
					<span v-if="radius > 0">{{ $t('plugins.heightmap.radius', [$display(radius, 0, 'mm')]) }}</span>
					<span>{{ $t('plugins.heightmap.area', [$display(area / 100, 1, 'cm²')]) }}</span>
					<span>{{ $t('plugins.heightmap.maxDeviations', [$display(minDiff, 3), $display(maxDiff, 3, 'mm')]) }}</span>
					<span>{{ $t('plugins.heightmap.meanError', [$display(meanError, 3, 'mm')]) }}</span>
					<span>{{ $t('plugins.heightmap.rmsError', [$display(rmsError, 3, 'mm')]) }}</span>
				</v-card-text>
			</v-card>

			<v-card class="d-flex flex-column mt-5" tile>
				<v-card-title class="pt-2 pb-1">
					<v-icon class="mr-2">mdi-eye</v-icon>
					{{ $t('plugins.heightmap.display') }}
				</v-card-title>
				<v-card-text class="d-flex flex-column">
					<div class="d-flex flex-column mt-1">
						{{ $t('plugins.heightmap.colorScheme') }}
						<v-btn-toggle class="mt-1" v-model="colorScheme">
							<v-btn class="flex-grow-1" value="terrain">{{ $t('plugins.heightmap.terrain') }}</v-btn>
							<v-btn class="flex-grow-1" value="heat">{{ $t('plugins.heightmap.heat') }}</v-btn>
						</v-btn-toggle>
					</div>

					<!-- deviation coloring -->
					<div class="d-flex flex-column mt-1">
						{{ $t('plugins.heightmap.range') }}
						<v-btn-toggle class="mt-1" v-model="deviationColoring">
							<v-btn class="flex-grow-1" value="fixed">{{ $t('plugins.heightmap.fixed') }}</v-btn>
							<v-btn class="flex-grow-1" value="deviation">{{ $t('plugins.heightmap.deviation') }}</v-btn>
						</v-btn-toggle>
					</div>
					<v-switch :disabled="uiFrozen || loading || !ready" :label="$t('plugins.heightmap.invertZ')" v-model="invertZ"></v-switch>

					<v-btn :disabled="uiFrozen || loading || !ready" :elevation="1" @click="topView" class="ml-0 mt-3">
						<v-icon class="mr-1" small>mdi-format-vertical-align-bottom</v-icon>
						{{ $t('plugins.heightmap.topView') }}
					</v-btn>
					<v-btn :disabled="uiFrozen || loading || !ready" :elevation="1" @click="resetView" class="ml-0 mt-3">
						<v-icon class="mr-1" small>mdi-camera</v-icon>
						{{ $t('plugins.heightmap.resetView') }}
					</v-btn>
				</v-card-text>
			</v-card>
		</v-col>

		<v-tooltip :position-x="tooltip.x" :position-y="tooltip.y" absolute top v-model="tooltip.shown">
			<span class="no-cursor">
				{{ xLabel }}: {{ $display(tooltip.coord.x, 1, 'mm') }}
				<br />
				{{ yLabel }}: {{ $display(tooltip.coord.y, 1, 'mm') }}
				<br />
				Z: {{ $display(tooltip.coord.z, 3, 'mm') }}
			</span>
		</v-tooltip>
	</v-row>
</template>

<script>
'use strict';

import {mapState, mapGetters, mapActions} from 'vuex';
import HeightMapViewer from './3dbjs';
import {setPluginData, PluginDataType} from '../../store';
import CSV from '../../utils/csv.js';
import Events from '../../utils/events.js';
import Path from '../../utils/path.js';
import {KinematicsName} from '../../store/machine/modelEnums';
let heightMapViewer;
export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters(['isConnected', 'uiFrozen']),
		...mapState('machine/cache', {
			pluginCache: (state) => state.plugins.HeightMap,
		}),
		...mapState('machine/model', {
			heightmapFile: (state) => state.move.compensation.file,
			systemDirectory: (state) => state.directories.system,
			axes: (state) => state.move.axes,
			kinematicsName: (state) => state.move.kinematics.name,
		}),
		...mapState('settings', ['language']),
		colorScheme: {
			get() {
				return this.pluginCache.colorScheme;
			},
			set(value) {
				setPluginData('HeightMap', PluginDataType.machineCache, 'colorScheme', value);
			},
		},
		deviationColoring: {
			get() {
				return this.pluginCache.deviationColoring;
			},
			set(value) {
				setPluginData('HeightMap', PluginDataType.machineCache, 'deviationColoring', value);
			},
		},
		invertZ: {
			get() {
				return this.pluginCache.invertZ;
			},
			set(value) {
				setPluginData('HeightMap', PluginDataType.machineCache, 'invertZ', value);
			},
		},
		isDelta() {
			return this.kinematicsName === KinematicsName.delta || this.kinematicsName === KinematicsName.rotaryDelta;
		},
		bedAxesValues() {
			return this.axes.map((d) => {
				return { letter: d.letter, min: d.min, max: d.max };
			});
		},
	},
	data() {
		return {
			files: [],
			selectedFile: null,

			isActive: true,
			ready: false,
			loading: false,
			errorMessage: null,

			tooltip: {
				coord: {
					x: 0,
					y: 0,
					z: 0,
				},
				x: undefined,
				y: undefined,
				shown: false,
			},
			xLabel: 'X',
			yLabel: 'Y',
			numPoints: undefined, // points excluding NaN
			area: undefined,
			radius: undefined,
			minDiff: undefined,
			maxDiff: undefined,
			meanError: undefined,
			rmsError: undefined,

			heightmapPoints: undefined,
			probeRadius: undefined,
		};
	},
	methods: {
		...mapActions('machine', ['download', 'getFileList']),
		resize() {
			if (!this.isActive) {
				return;
			}

			// Resize canvas elements
			const width = Math.max(this.$refs.container.offsetWidth - 80, 0);
			let height;
			switch (this.$vuetify.breakpoint.name) {
				case 'xs':
					height = width;
					break;
				case 'sm':
					height = (width * 3) / 4;
					break;
				case 'xl':
					height = (width * 10) / 16;
					break;
				default:
					height = (width * 9) / 16;
					break;
			}

			this.$refs.container.style.height = `${height}px`;
			this.$refs.legend.style.left = `${width}px`;
			this.$refs.legend.height = height;
			this.$refs.canvas.width = width;
			this.$refs.canvas.height = height;

			if (heightMapViewer) {
				heightMapViewer.resize();
				// Redraw the legend and return the canvas size
				heightMapViewer.drawLegend(this.$refs.legend, this.colorScheme, this.invertZ, this.xLabel, this.yLabel);
			}

			return { width, height };
		},
		showCSV(csvData) {
			// Load the CSV. The first line is a comment that can be removed
			const csv = new CSV(csvData.substring(csvData.indexOf('\n') + 1));
			this.xLabel = csv.get('axis0') || 'X';
			this.yLabel = csv.get('axis1') || 'Y';
			let radius = parseFloat(csv.get('radius'));
			if (radius <= 0) {
				radius = undefined;
			}
			let xMin = parseFloat(csv.get('min0'));
			if (isNaN(xMin)) {
				xMin = parseFloat(csv.get('xmin'));
			}
			let yMin = parseFloat(csv.get('min1'));
			if (isNaN(yMin)) {
				yMin = parseFloat(csv.get('ymin'));
			}
			let xSpacing = parseFloat(csv.get('spacing0'));
			if (isNaN(xSpacing)) {
				xSpacing = parseFloat(csv.get('xspacing'));
			}
			if (isNaN(xSpacing)) {
				xSpacing = parseFloat(csv.get('spacing'));
			}
			let ySpacing = parseFloat(csv.get('spacing1'));
			if (isNaN(ySpacing)) {
				ySpacing = parseFloat(csv.get('yspacing'));
			}
			if (isNaN(ySpacing)) {
				ySpacing = parseFloat(csv.get('spacing'));
			}

			// Convert each point to a vector
			const points = [];
			for (let y = 1; y < csv.content.length; y++) {
				const xpoints = [];
				for (let x = 0; x < csv.content[y].length; x++) {
					const value = csv.content[y][x].trim();
					xpoints.push([xMin + x * xSpacing, yMin + (y - 1) * ySpacing, value === '0' ? NaN : parseFloat(value)]);
				}
				points.push(xpoints);
			}

			this.heightmapPoints = points;
			// Display height map and redraw legend
			this.showHeightMap(points, radius);
		},
		showHeightMap(points, probeRadius) {
			// Generate stats
			let xMin, xMax, yMin, yMax;

			this.radius = probeRadius;
			this.numPoints = 0;
			this.minDiff = undefined;
			this.maxDiff = undefined;
			this.meanError = 0;
			this.rmsError = 0;

			for (let i = 0; i < points.length; i++)
				for (let j = 0; j < points[i].length; j++) {
					const z = points[i][j][2];
					if (!isNaN(z)) {
						const x = points[i][j][0];
						const y = points[i][j][1];
						if (xMin === undefined || xMin > x) {
							xMin = x;
						}
						if (xMax === undefined || xMax < x) {
							xMax = x;
						}
						if (yMin === undefined || yMin > y) {
							yMin = y;
						}
						if (yMax === undefined || yMax < y) {
							yMax = y;
						}

						this.numPoints++;
						this.meanError += z;
						this.rmsError += z * z;
						if (this.minDiff === undefined || this.minDiff > z) {
							this.minDiff = z;
						}
						if (this.maxDiff === undefined || this.maxDiff < z) {
							this.maxDiff = z;
						}
					}
				}

			this.area = probeRadius ? probeRadius * probeRadius * Math.PI : Math.abs((xMax - xMin) * (yMax - yMin));
			this.rmsError = Math.sqrt(this.rmsError * this.numPoints - this.meanError * this.meanError) / this.numPoints;
			this.meanError = this.meanError / this.numPoints;
			heightMapViewer.renderHeightMap(points, this.invertZ, this.colorScheme, this.deviationColoring);
			heightMapViewer.drawLegend(this.$refs.legend, this.colorScheme, this.invertZ, this.xLabel, this.yLabel);
		},
		canvasMouseMove(e) {
			this.tooltip.x = e.clientX;
			this.tooltip.y = e.clientY;
		},
		topView() {
			heightMapViewer.topView();
		},
		resetView(){
			heightMapViewer.resetCamera();
		},
		async refresh() {
			if (!this.isConnected) {
				this.ready = false;
				this.errorMessage = null;
				this.selectedFile = null;
				this.files = [];
				return;
			}

			if (this.loading) {
				// Don't do multiple actions at once
				return;
			}

			this.loading = true;
			try {
				const files = await this.getFileList(this.systemDirectory);
				this.files = files
					.filter(file => !file.isDirectory && file.name !== Path.filamentsFile && file.name.endsWith('.csv'))
					.map(file => file.name)
					.sort();
			} finally {
				this.loading = false;
			}

			if (this.files.indexOf(this.selectedFile) === -1) {
				if (this.heightmapFile && this.files.indexOf(Path.extractFileName(this.heightmapFile)) !== -1) {
					this.selectedFile = Path.extractFileName(this.heightmapFile);
				} else if (this.files.indexOf(Path.heightmapFile) !== -1) {
					this.selectedFile = Path.heightmapFile;
				} else {
					this.selectedFile = null;
				}
			}
			this.loading = false;
		},
		async getHeightMap() {
			if (this.loading) {
				// Don't attempt to load more than one file at once...
				return;
			}

			this.ready = false;
			this.loading = true;
			try {
				if (this.selectedFile) {
					const heightmap = await this.download({
						filename: Path.combine(this.systemDirectory, this.selectedFile),
						type: 'text',
						showProgress: false,
						showSuccess: false,
						showError: false,
					});
					this.showCSV(heightmap);
				} else {
					this.errorMessage = null;
				}
			} catch (e) {
				console.warn(e);
				this.errorMessage = e.message;
			}
			this.loading = false;
			this.ready = true;
		},

		async testMesh() {
			const csvData =
				'RepRapFirmware height map file v1\nxmin,xmax,ymin,ymax,radius,spacing,xnum,ynum\n-140.00,140.10,-140.00,140.10,150.00,20.00,15,15\n0,0,0,0,0,-0.139,-0.188,-0.139,-0.202,-0.224,0,0,0,0,0\n0,0,0,-0.058,-0.066,-0.109,-0.141,-0.129,-0.186,-0.198,-0.191,-0.176,0,0,0\n0,0,0.013,-0.008,-0.053,-0.071,-0.087,-0.113,-0.162,-0.190,-0.199,-0.267,-0.237,0,0\n0,0.124,0.076,0.025,-0.026,-0.054,-0.078,-0.137,-0.127,-0.165,-0.201,-0.189,-0.227,-0.226,0\n0,0.198,0.120,0.047,0.089,-0.074,-0.097,-0.153,-0.188,-0.477,-0.190,-0.199,-0.237,-0.211,0\n0.312,0.229,0.198,0.098,0.097,0.004,-0.089,-0.516,-0.150,-0.209,-0.197,-0.183,-0.216,-0.296,-0.250\n0.287,0.263,0.292,0.100,0.190,0.015,-0.102,-0.039,-0.125,-0.149,-0.137,-0.198,-0.188,-0.220,-0.192\n0.378,0.289,0.328,0.172,0.133,0.078,-0.086,0.134,-0.100,-0.150,-0.176,-0.234,-0.187,-0.199,-0.221\n0.360,0.291,0.260,0.185,0.111,0.108,0.024,0.073,-0.024,-0.116,-0.187,-0.252,-0.201,-0.215,-0.187\n0.447,0.397,0.336,0.276,0.180,0.164,0.073,-0.050,-0.049,-0.109,-0.151,-0.172,-0.211,-0.175,-0.161\n0,0.337,0.289,0.227,0.179,0.127,0.086,0.034,-0.039,-0.060,-0.113,-0.108,-0.171,-0.153,0\n0,0.478,0.397,0.374,0.270,0.141,0.085,0.074,0.037,-0.048,-0.080,-0.187,-0.126,-0.175,0\n0,0,0.373,0.364,0.265,0.161,0.139,0.212,0.040,0.046,-0.008,-0.149,-0.115,0,0\n0,0,0,0.346,0.295,0.273,0.148,0.136,0.084,0.024,-0.055,-0.078,0,0,0\n0,0,0,0,0,0.240,0.178,0.084,0.090,0.004,0,0,0,0,0';
			this.showCSV(csvData);
		},
		async testBedCompensation(numPoints) {
			let testPoints;
			switch (numPoints) {
				case 3:
					testPoints = [
						[15.0, 15.0, 0.123],
						[15.0, 195.0, -0.243],
						[215.0, 105.0, 0.034],
					];
					break;
				case 4:
					testPoints = [
						[15.0, 15.0, 0.015],
						[15.0, 185.0, -0.193],
						[175.0, 185.0, 0.156],
						[175.0, 15.0, 0.105],
					];
					break;
				case 5:
					testPoints = [
						[15.0, 15.0, 0.007],
						[15.0, 185.0, -0.121],
						[175.0, 185.0, -0.019],
						[175.0, 15.0, 0.193],
						[95.0, 100.0, 0.05],
					];
					break;
				default:
					throw new Error('Bad number of probe points, only one of 3/4/5 is supported');
			}
			this.showHeightMap(testPoints);
		},

		filesOrDirectoriesChanged({machine, files}) {
			if (machine === this.selectedMachine) {
				if (this.selectedFile && files.indexOf(Path.combine(this.systemDirectory, this.selectedFile)) >= 0) {
					// Current heightmap has been changed, reload it and then refresh the list
					this.getHeightMap(this.selectedFile).then(this.refresh);
				} else if (files.some((file) => file.endsWith('.csv')) && Path.filesAffectDirectory(files, this.systemDirectory)) {
					// CSV file or directory has been changed
					this.refresh();
				}
			}
		},
		buildBed() {
			if (this.axes) {
				for (var axesIdx in this.axes) {
					let axes = this.axes[axesIdx];
					if ('XYZ'.includes(axes.letter)) {
						var letter = axes.letter.toLowerCase();
						heightMapViewer.buildVolume[letter].min = axes.min;
						heightMapViewer.buildVolume[letter].max = axes.max;
					}
				}
				heightMapViewer.renderBed();
				heightMapViewer.resetCamera();
			}
		},
	},
	activated() {
		this.isActive = true;
		this.resize();
	},
	deactivate() {
		this.isActive = false;
	},
	async mounted() {
		const size = this.resize();
		if (size.height <= 0) {
			size.height = 1;
		}

		heightMapViewer = new HeightMapViewer(this.$refs.canvas);

		if (this.isDelta) {
			heightMapViewer.isDelta = this.isDelta;
		}
		await heightMapViewer.init();
		this.buildBed();

		heightMapViewer.labelCallback = (metadata) => {
			if (metadata) {
				this.tooltip.coord.x = metadata.x;
				this.tooltip.coord.y = metadata.y;
				this.tooltip.coord.z = metadata.z;
				this.tooltip.shown = true;
			} else {
				this.tooltip.shown = false;
			}
		};

		// Set current heightmap
		if (this.isConnected) {
			this.refresh();
		}

		// Keep track of file changes
		this.$root.$on(Events.filesOrDirectoriesChanged, this.filesOrDirectoriesChanged);

		// Kill the wheel on the canvas
		this.$refs.canvas.addEventListener('wheel', evt => evt.preventDefault());

		// Trigger resize event once more to avoid rendering glitches
		setTimeout(this.resize.bind(this), 250);
		this.ready = true;
	},
	beforeDestroy() {
		// No longer keep track of file changes
		this.$root.$off(Events.filesOrDirectoriesChanged, this.filesOrDirectoriesChanged);
		heightMapViewer.destroy();
	},
	watch: {
		colorScheme() {
			if (this.heightmapPoints) {
				this.showHeightMap(this.heightmapPoints, this.probeRadius);
			}
		},
		deviationColoring() {
			if (this.heightmapPoints) {
				this.showHeightMap(this.heightmapPoints, this.probeRadius);
			}
		},
		files() {
			this.$nextTick(this.resize);
		},
		invertZ() {
			if (this.heightmapPoints) {
				this.showHeightMap(this.heightmapPoints, this.probeRadius);
			}
		},
		isConnected() {
			this.refresh();
		},
		heightmapFile(to) {
			if (to) {
				const that = this;
				this.refresh().then(async function () {
					const fileName = Path.extractFileName(to);
					if (that.selectedFile === fileName) {
						await that.getHeightMap();
					} else {
						that.selectedFile = fileName;
					}
				});
			}
		},
		selectedFile() {
			this.getHeightMap();
		},
		systemDirectory() {
			this.refresh();
		},
		language() {
			if (heightMapViewer) {
				heightMapViewer.drawLegend(this.$refs.legend, this.colorScheme);
			}
		},
		bedAxesValues: {
			deep: true,
			handler() {
				this.buildBed();
			},
		},
		isDelta(to) {
			if (heightMapViewer) {
				heightMapViewer.isDelta = to;
				if (this.heightmapPoints) {
					this.showHeightMap(this.heightmapPoints, this.probeRadius);
				}
			}
		},
	},
};
</script>
