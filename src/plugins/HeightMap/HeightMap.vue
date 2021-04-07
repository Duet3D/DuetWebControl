<style scoped>
.heightmap-container {
	background-color: #000;
	color: #FFF;
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
		<v-col cols="12" sm="6" lg="auto" order="1" order-lg="0">
			<v-card tile>
				<v-card-title class="pt-2 pb-1">
					<v-icon class="mr-2">mdi-format-list-bulleted</v-icon> {{ $t('plugins.heightmap.listTitle') }}
					<v-spacer></v-spacer>
					<v-icon class="ml-2" @click="refresh">mdi-refresh</v-icon>
				</v-card-title>
				<v-card-text class="pa-0" v-show="files.length === 0">
					<v-alert :value="true" type="info" class="mb-0">
						{{ $t('plugins.heightmap.none') }}
					</v-alert>
				</v-card-text>

				<v-list class="py-0" :disabled="uiFrozen || !ready || loading">
					<v-list-item-group :value="files.indexOf(selectedFile)" color="primary">
						<v-list-item v-for="file in files" :key="file" @click="selectedFile = file">
							{{ file }}
						</v-list-item>
					</v-list-item-group>
				</v-list>
			</v-card>
		</v-col>

		<v-col cols="12" lg="auto" order="0" order-lg="0" :class="{ 'pa-1': $vuetify.breakpoint.xs }" class="flex-grow-1">
			<div ref="container" class="heightmap-container" v-resize="resize">
				<h1 v-show="!ready" class="text-center">
					{{ loading ? $t('generic.loading') : (errorMessage ? errorMessage : $t('plugins.heightmap.notAvailable')) }}
				</h1>

				<div v-show="ready" class="canvas-container">
					<canvas ref="canvas" @mousemove="canvasMouseMove"></canvas>
					<canvas ref="legend" class="legend" width="80"></canvas>
				</div>
			</div>
		</v-col>

		<v-col cols="12" sm="6" lg="auto" order="2" class="d-flex flex-column">
			<v-card tile class="d-flex flex-column flex-grow-1">
				<v-card-title class="pt-2 pb-1">
					<v-icon class="mr-2">mdi-information</v-icon> {{ $t('plugins.heightmap.statistics') }}
				</v-card-title>
				<v-card-text class="d-flex flex-column flex-grow-1 justify-space-between pt-2">
					<span>
						{{ $t('plugins.heightmap.numPoints', [$display(numPoints, 0)]) }}
					</span>
					<span v-if="radius > 0">
						{{ $t('plugins.heightmap.radius', [$display(radius, 0, 'mm')]) }}
					</span>
					<span>
						{{ $t('plugins.heightmap.area', [$display(area / 100, 1, 'cm²')]) }}
					</span>
					<span>
						{{ $t('plugins.heightmap.maxDeviations', [$display(minDiff, 3), $display(maxDiff, 3, 'mm')]) }}
					</span>
					<span>
						{{ $t('plugins.heightmap.meanError', [$display(meanError, 3, 'mm')]) }}
					</span>
					<span>
						{{ $t('plugins.heightmap.rmsError', [$display(rmsError, 3, 'mm')]) }}
					</span>
				</v-card-text>
			</v-card>

			<v-card tile class="d-flex flex-column mt-5">
				<v-card-title class="pt-2 pb-1">
					<v-icon class="mr-2">mdi-eye</v-icon> {{ $t('plugins.heightmap.display') }}
				</v-card-title>
				<v-card-text class="d-flex flex-column">
					<div class="d-flex flex-column mt-1">
						{{ $t('plugins.heightmap.colorScheme') }}
						<v-btn-toggle v-model="colorScheme" class="mt-1">
							<v-btn value="terrain" class="flex-grow-1">{{ $t('plugins.heightmap.terrain') }}</v-btn>
							<v-btn value="heat" class="flex-grow-1">{{ $t('plugins.heightmap.heat') }}</v-btn>
						</v-btn-toggle>
					</div>

					<v-switch v-model="invertZ" :label="$t('plugins.heightmap.invertZ')" :disabled="uiFrozen || loading || !ready"></v-switch>

					<v-btn @click="topView" :disabled="uiFrozen || loading || !ready" :elevation="1" class="ml-0 mt-3" >
						<v-icon small class="mr-1">mdi-format-vertical-align-bottom</v-icon> {{ $t('plugins.heightmap.topView') }}
					</v-btn>
				</v-card-text>
			</v-card>
		</v-col>

		<v-tooltip top absolute v-model="tooltip.shown" :position-x="tooltip.x" :position-y="tooltip.y">
			<span class="no-cursor">
				{{ xLabel }}: {{ $display(tooltip.coord.x, 1, 'mm') }} <br>
				{{ yLabel }}: {{ $display(tooltip.coord.y, 1, 'mm') }} <br>
				Z: {{ $display(tooltip.coord.z, 3, 'mm') }}
			</span>
		</v-tooltip>
	</v-row>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

import { Scene, PerspectiveCamera, WebGLRenderer, Raycaster, Mesh, MeshBasicMaterial, Vector2, Vector3, VertexColors, DoubleSide, ArrowHelper, GridHelper } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { setPluginData, PluginDataType } from '../../store'

import { drawLegend, setFaceColors, generateIndicators, generateMeshGeometry } from './3d.js'
import CSV from '../../utils/csv.js'
import Events from '../../utils/events.js'
import Path from '../../utils/path.js'

const scaleZ = 0.5, maxVisualizationZ = 0.25
const indicatorColor = 0xFFFFFF, indicatorOpacity = 0.4, indicatorOpacityHighlighted = 1.0

export default {
	beforeCreate() {
		this.three = {						// non-reactive data
			scene: null,
			camera: null,
			renderer: null,
			orbitControls: null,
			raycaster: null,

			hasHelpers: false,
			meshGeometry: null,
			meshPlane: null,
			meshIndicators: null,
			lastIntersection: null
		}
	},
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters(['isConnected', 'uiFrozen']),
		...mapState('machine/cache', {
			pluginCache: state => state.plugins.HeightMap
		}),
		...mapState('machine/model', {
			heightmapFile: state => state.move.compensation.file,
			systemDirectory: state => state.directories.system,
		}),
		...mapState('settings', ['language']),
		colorScheme: {
			get() { return this.pluginCache.colorScheme; },
			set(value) { setPluginData('HeightMap', PluginDataType.machineCache, 'colorScheme', value); }
		},
		invertZ: {
			get() { return this.pluginCache.invertZ; },
			set(value) { setPluginData('HeightMap', PluginDataType.machineCache, 'invertZ', value); }
		}
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
					z: 0
				},
				x: undefined,
				y: undefined,
				shown: false
			},
			xLabel: 'X',
			yLabel: 'Y',
			numPoints: undefined,			// points excluding NaN
			area: undefined,
			radius: undefined,
			minDiff: undefined,
			maxDiff: undefined,
			meanError: undefined,
			rmsError: undefined,

			heightmapPoints: undefined,
			probeRadius: undefined
		}
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
					height = width * 3 / 4;
					break;
				case 'xl':
					height = width * 10 / 16;
					break;
				default:
					height = width * 9 / 16;
					break;
			}

			this.$refs.container.style.height = `${height}px`;
			this.$refs.legend.style.left = `${width}px`;
			this.$refs.legend.height = height;
			this.$refs.canvas.width = width;
			this.$refs.canvas.height = height;

			// Resize the 3D height map
			if (this.three.renderer && height > 0) {
				this.three.camera.aspect = width / height;
				this.three.camera.updateProjectionMatrix();
				this.three.renderer.setSize(width, height);
			}

			// Redraw the legend and return the canvas size
			drawLegend(this.$refs.legend, maxVisualizationZ, this.colorScheme, this.invertZ, this.xLabel, this.yLabel);
			return { width, height };
		},
		showCSV(csvData) {
			// Load the CSV. The first line is a comment that can be removed
			const csv = new CSV(csvData.substring(csvData.indexOf('\n') + 1));
			this.xLabel = csv.get('axis0') || 'X';
			this.yLabel = csv.get('axis1') || 'Y';
			let radius = parseFloat(csv.get('radius'));
			if (radius <= 0) { radius = undefined; }
			let xMin = parseFloat(csv.get('min0'));
			if (isNaN(xMin)) { xMin = parseFloat(csv.get('xmin')); }
			let yMin = parseFloat(csv.get('min1'));
			if (isNaN(yMin)) { yMin = parseFloat(csv.get('ymin')); }
			let xSpacing = parseFloat(csv.get('spacing0'));
			if (isNaN(xSpacing)) { xSpacing = parseFloat(csv.get('xspacing')); }
			if (isNaN(xSpacing)) { xSpacing = parseFloat(csv.get('spacing')); }
			let ySpacing = parseFloat(csv.get('spacing1'));
			if (isNaN(ySpacing)) { ySpacing = parseFloat(csv.get('yspacing')); }
			if (isNaN(ySpacing)) { ySpacing = parseFloat(csv.get('spacing')); }

			// Convert each point to a vector
			const points = [];
			for (let y = 1; y < csv.content.length; y++) {
				for (let x = 0; x < csv.content[y].length; x++) {
					const value = csv.content[y][x].trim();
					points.push([xMin + x * xSpacing, yMin + (y - 1) * ySpacing, (value === '0') ? NaN : parseFloat(value)]);
				}
			}

			// Display height map and redraw legend
			this.showHeightMap(points, radius);
			drawLegend(this.$refs.legend, maxVisualizationZ, this.colorScheme, this.invertZ, this.xLabel, this.yLabel);
		},
		showHeightMap(points, probeRadius) {
			// Clean up first
			if (this.three.meshGeometry) {
				this.three.scene.remove(this.three.meshPlane);
				this.three.meshIndicators.forEach(function(indicator) {
					this.remove(indicator);
				}, this.three.scene);

				this.three.meshGeometry = null;
				this.three.meshPlane = null;
				this.three.meshIndicators = null;
				this.three.lastIntersection = null;
			}

			// Generate stats
			let xMin, xMax, yMin, yMax;

			this.radius = probeRadius;
			this.numPoints = 0;
			this.minDiff = undefined;
			this.maxDiff = undefined;
			this.meanError = 0;
			this.rmsError = 0;

			for (let i = 0; i < points.length; i++) {
				const z = points[i][2];
				if (!isNaN(z)) {
					const x = points[i][0];
					const y = points[i][1];
					if (xMin === undefined || xMin > x) { xMin = x; }
					if (xMax === undefined || xMax < x) { xMax = x; }
					if (yMin === undefined || yMin > y) { yMin = y; }
					if (yMax === undefined || yMax < y) { yMax = y; }

					this.numPoints++;
					this.meanError += z;
					this.rmsError += z * z;
					if (this.minDiff === undefined || this.minDiff > z) { this.minDiff = z; }
					if (this.maxDiff === undefined || this.maxDiff < z) { this.maxDiff = z; }
				}
			}

			this.area = probeRadius ? (probeRadius * probeRadius * Math.PI) : Math.abs((xMax - xMin) * (yMax - yMin));
			this.rmsError = Math.sqrt(((this.rmsError * this.numPoints) - (this.meanError * this.meanError))) / this.numPoints;
			this.meanError = this.meanError / this.numPoints;

			// Generate mesh geometry and apply face colors
			this.three.meshGeometry = generateMeshGeometry(points, xMin, xMax, yMin, yMax, this.invertZ ? -scaleZ : scaleZ);
			setFaceColors(this.three.meshGeometry, scaleZ, this.colorScheme, maxVisualizationZ);

			// Make 3D mesh and add it
			const material = new MeshBasicMaterial({ vertexColors: VertexColors, side: DoubleSide });
			this.three.meshPlane = new Mesh(this.three.meshGeometry, material);
			this.three.scene.add(this.three.meshPlane);

			// Make indicators and add them
			this.three.meshIndicators = generateIndicators(this.three.meshGeometry, this.numPoints, scaleZ, indicatorColor, indicatorOpacity);
			this.three.meshIndicators.forEach(function(indicator) {
				this.add(indicator);
			}, this.three.scene);

			if (!this.three.hasHelpers) {
				// Make axis arrows for XYZ
				this.three.scene.add(new ArrowHelper(new Vector3(1, 0, 0), new Vector3(-0.6, -0.6, 0), 0.5, 0xFF0000));
				this.three.scene.add(new ArrowHelper(new Vector3(0, 1, 0), new Vector3(-0.6, -0.6, 0), 0.5, 0x00FF00));
				this.three.scene.add(new ArrowHelper(new Vector3(0, 0, 1), new Vector3(-0.6, -0.6, 0), 0.5, 0x0000FF));

				// Make grid on XY plane
				const grid = new GridHelper(1.1, 15);
				grid.rotation.x = -Math.PI / 2;
				this.three.scene.add(grid);

				// Don't add these helpers again
				this.three.hasHelpers = true;
			}

			// Render scene
			this.heightmapPoints = points;
			this.probeRadius = probeRadius;
			this.ready = true;
			this.render();
		},
		render() {
			if (this.three.renderer) {
				requestAnimationFrame(this.render);
				this.three.renderer.render(this.three.scene, this.three.camera);
			}
		},
		canvasMouseMove(e) {
			if (!e.clientX || !this.three.meshGeometry) {
				return;
			}

			// Try to get the Z value below the cursor
			// For that we need normalized X+Y coordinates between -1.0 and 1.0
			const rect = e.target.getBoundingClientRect();
			const mouse = new Vector2();
			mouse.x = (e.clientX - rect.left) / e.target.clientWidth * 2 - 1;
			mouse.y = -(e.clientY - rect.top) / e.target.clientHeight * 2 + 1;

			// Is the cursor on a point indicator?
			this.three.raycaster.setFromCamera(mouse, this.three.camera);
			const intersection = this.three.raycaster.intersectObjects(this.three.meshIndicators);
			if (this.three.lastIntersection && (intersection.length === 0 || intersection[0] !== this.three.lastIntersection)) {
				this.three.lastIntersection.object.material.opacity = indicatorOpacity;
				this.three.lastIntersection = undefined;
			}

			let intersectionPoint;
			if (intersection.length > 0) {
				if (intersection[0] !== this.three.lastIntersection) {
					intersection[0].object.material.opacity = indicatorOpacityHighlighted;
					this.three.lastIntersection = intersection[0];
				}
				intersectionPoint = intersection[0].object.coords;
			}

			// Show or hide the tooltip
			if (intersectionPoint) {
				this.tooltip.coord.x = intersectionPoint.x;
				this.tooltip.coord.y = intersectionPoint.y;
				this.tooltip.coord.z = this.invertZ ? -intersectionPoint.z : intersectionPoint.z;
				this.tooltip.x = e.clientX;
				this.tooltip.y = e.clientY;
				this.tooltip.shown = true;
			} else {
				this.tooltip.shown = false;
			}
		},
		topView() {
			this.three.camera.position.set(0, 0, 1.5);
			this.three.camera.rotation.set(0, 0, 0);
			this.three.camera.updateProjectionMatrix();
			this.three.orbitControls.update();
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
					.map(file => file.name);
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
		},
		async getHeightMap() {
			if (this.loading) {
				// Don't attempt to load more than one file at once...
				return;
			}

			if (!this.three.scene) {
				await this.init();
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
						showError: false
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
		},

		async testMesh() {
			if (!this.three.scene) {
				await this.init();
			}

			const csvData = 'RepRapFirmware height map file v1\nxmin,xmax,ymin,ymax,radius,spacing,xnum,ynum\n-140.00,140.10,-140.00,140.10,150.00,20.00,15,15\n0,0,0,0,0,-0.139,-0.188,-0.139,-0.202,-0.224,0,0,0,0,0\n0,0,0,-0.058,-0.066,-0.109,-0.141,-0.129,-0.186,-0.198,-0.191,-0.176,0,0,0\n0,0,0.013,-0.008,-0.053,-0.071,-0.087,-0.113,-0.162,-0.190,-0.199,-0.267,-0.237,0,0\n0,0.124,0.076,0.025,-0.026,-0.054,-0.078,-0.137,-0.127,-0.165,-0.201,-0.189,-0.227,-0.226,0\n0,0.198,0.120,0.047,0.089,-0.074,-0.097,-0.153,-0.188,-0.477,-0.190,-0.199,-0.237,-0.211,0\n0.312,0.229,0.198,0.098,0.097,0.004,-0.089,-0.516,-0.150,-0.209,-0.197,-0.183,-0.216,-0.296,-0.250\n0.287,0.263,0.292,0.100,0.190,0.015,-0.102,-0.039,-0.125,-0.149,-0.137,-0.198,-0.188,-0.220,-0.192\n0.378,0.289,0.328,0.172,0.133,0.078,-0.086,0.134,-0.100,-0.150,-0.176,-0.234,-0.187,-0.199,-0.221\n0.360,0.291,0.260,0.185,0.111,0.108,0.024,0.073,-0.024,-0.116,-0.187,-0.252,-0.201,-0.215,-0.187\n0.447,0.397,0.336,0.276,0.180,0.164,0.073,-0.050,-0.049,-0.109,-0.151,-0.172,-0.211,-0.175,-0.161\n0,0.337,0.289,0.227,0.179,0.127,0.086,0.034,-0.039,-0.060,-0.113,-0.108,-0.171,-0.153,0\n0,0.478,0.397,0.374,0.270,0.141,0.085,0.074,0.037,-0.048,-0.080,-0.187,-0.126,-0.175,0\n0,0,0.373,0.364,0.265,0.161,0.139,0.212,0.040,0.046,-0.008,-0.149,-0.115,0,0\n0,0,0,0.346,0.295,0.273,0.148,0.136,0.084,0.024,-0.055,-0.078,0,0,0\n0,0,0,0,0,0.240,0.178,0.084,0.090,0.004,0,0,0,0,0';
			this.showCSV(csvData);
		},
		async testBedCompensation(numPoints) {
			if (!this.three.scene) {
				await this.init();
			}

			let testPoints;
			switch (numPoints) {
				case 3:
					testPoints = [[15.0, 15.0, 0.123], [15.0, 195.0, -0.243], [215.0, 105.0, 0.034]];
					break;
				case 4:
					testPoints = [[15.0, 15.0, 0.015], [15.0, 185.0, -0.193], [175.0, 185.0, 0.156], [175.0, 15.0, 0.105]];
					break;
				case 5:
					testPoints = [[15.0, 15.0, 0.007], [15.0, 185.0, -0.121], [175.0, 185.0, -0.019], [175.0, 15.0, 0.193], [95.0, 100.0, 0.05]];
					break;
				default:
					throw new Error("Bad number of probe points, only one of 3/4/5 is supported");
			}
			this.showHeightMap(testPoints);
		},

		filesOrDirectoriesChanged({ machine, files }) {
			if (machine === this.selectedMachine) {
				if (this.selectedFile && files.indexOf(Path.combine(this.systemDirectory, this.selectedFile)) >= 0) {
					// Current heightmap has been changed, reload it and then refresh the list
					this.getHeightMap(this.selectedFile).then(this.refresh);
				}
				else if (files.some(file => file.endsWith('.csv')) && Path.filesAffectDirectory(files, this.systemDirectory)) {
					// CSV file or directory has been changed
					this.refresh();
				}
			}
		}
	},
	activated() {
		this.isActive = true;
		this.resize();
	},
	deactivate() {
		this.isActive = false;
	},
	mounted() {
		const size = this.resize();
		if (size.height <= 0) {
			size.height = 1;
		}

		// Create THREE instances
		this.three.scene = new Scene();
		this.three.camera = new PerspectiveCamera(45, size.width / size.height, 0.1, 1000);
		this.three.camera.position.set(0, -1.25, 1.25);
		this.three.camera.rotation.set(Math.PI / 4, 0, 0)
		this.three.camera.up.set(0, 0, 1);
		this.three.camera.updateProjectionMatrix();
		this.three.renderer = new WebGLRenderer({ canvas: this.$refs.canvas });
		this.three.renderer.setSize(size.width, size.height);
		this.three.orbitControls = new OrbitControls(this.three.camera, this.three.renderer.domElement);
		this.three.orbitControls.enableKeys = false;
		this.three.raycaster = new Raycaster();

		// Set current heightmap
		if (this.isConnected) {
			this.refresh();
		}

		// Keep track of file changes
		this.$root.$on(Events.filesOrDirectoriesChanged, this.filesOrDirectoriesChanged);

		// Trigger resize event once more to avoid rendering glitches
		setTimeout(this.resize.bind(this), 250);
	},
	beforeDestroy() {
		// No longer keep track of file changes
		this.$root.$off(Events.filesOrDirectoriesChanged, this.filesOrDirectoriesChanged);

		// Destroy the 3D view
		if (this.three.renderer) {
			this.three.renderer.forceContextLoss();
			this.three.renderer = null;
		}
	},
	watch: {
		colorScheme(to) {
			if (this.three.meshGeometry) {
				setFaceColors(this.three.meshGeometry, scaleZ, to, maxVisualizationZ);
			}
			drawLegend(this.$refs.legend, maxVisualizationZ, to);
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
				this.refresh().then(async function() {
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
			drawLegend(this.$refs.legend, maxVisualizationZ, this.colorScheme);
		}
	}
}
</script>
