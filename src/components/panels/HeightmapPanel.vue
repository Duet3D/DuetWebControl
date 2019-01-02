<style scoped>
.loading {
	background-color: black;
}
.loading h1{
	color: white;
}
.loading,
.canvas {
	border-radius: 8px 0 0 8px;
}
.legend {
	border-radius: 0 8px 8px 0;
}
canvas {
	display: flex;
	min-height: 480px;
}
.no-cursor {
	pointer-events: none;
}
</style>

<template>
	<div class="component">
		<v-card class="card">
			<v-container ref="container" class="pa-1" fluid>
				<v-layout row wrap fill-height>
					<!-- TODO: Add CSV list here -->

					<v-flex class="heightmap-container pa-2" xs12 sm12 md9 lg10 xl10>
						<v-layout ref="parentElement" row fill-height>
							<v-flex class="loading" v-show="!ready">
								<v-layout fill-height align-center>
									<v-flex tag="h1" class="text-xs-center">
										{{ loading ? 'loading...' : errorMessage }}
									</v-flex>
								</v-layout>
							</v-flex>
							<v-flex v-show="ready" shrink>
								<canvas ref="canvas" class="canvas" @mousemove="canvasMouseMove"></canvas>
							</v-flex>
							<v-flex d-flex shrink>
								<canvas ref="legend" class="legend" width="80"></canvas>
							</v-flex>
						</v-layout>
					</v-flex>

					<v-flex class="pa-2" xs12 sm12 md3 lg2 xl2>
						<v-layout column fill-height justifiy-space-between>
							<v-flex class="pt-2">
								Number of points: {{ $display(numPoints, 0) }}
							</v-flex>
							<v-flex>
								Probing radius: {{ $display(radius, 0, 'mm') }}
							</v-flex>
							<v-flex>
								Probe area: {{ $display(area / 100, 1, 'cm²') }}
							</v-flex>
							<v-flex>
								Maximum deviations: {{ $display(minDiff, 3) }} / {{ $display(maxDiff, 3, 'mm') }}
							</v-flex>
							<v-flex>
								Mean error: {{ $display(meanError, 3, 'mm') }}
							</v-flex>
							<v-flex>
								RMS error: {{ $display(rmsError, 3, 'mm') }}
							</v-flex>
							<v-flex>
								<v-btn class="ml-0" :disabled="!ready" @click="topView">
									<v-icon small class="mr-1">vertical_align_bottom</v-icon> Top view
								</v-btn>
							</v-flex>
							<v-flex shrink>
								Color scheme:
							</v-flex>
							<v-flex>
								<v-btn-toggle v-model="colorScheme">
									<v-btn value="terrain">Terrain</v-btn>
									<v-btn value="heat">Heat</v-btn>
								</v-btn-toggle>
							</v-flex>
							<v-flex class="pb-2" shrink :loading="loading" @click="getHeightmap">
								<v-btn>
									<v-icon class="mr-1">refresh</v-icon> Reload Height Map
								</v-btn>
							</v-flex>
						</v-layout>
					</v-flex>
				</v-layout>
			</v-container>
		</v-card>

		<v-tooltip top absolute v-model="tooltip.shown" :position-x="tooltip.x" :position-y="tooltip.y">
			<span class="no-cursor">
				X: {{ $display(tooltip.coord.x, 1, 'mm') }}<br/>
				Y: {{ $display(tooltip.coord.y, 1, 'mm') }}<br/>
				Z: {{ $display(tooltip.coord.z, 3, 'mm') }}
			</span>
		</v-tooltip>
	</div>
</template>

<script>
'use strict'

import { mapGetters, mapActions } from 'vuex'

import { Scene, PerspectiveCamera, WebGLRenderer, Raycaster, Mesh, MeshBasicMaterial, Vector2, Vector3, VertexColors, DoubleSide, ArrowHelper, GridHelper } from 'three'
import OrbitControls from 'three-orbitcontrols'

import { drawLegend, setFaceColors, generateIndicators, generateMeshGeometry } from '../../utils/3d.js'
import CSV from '../../utils/csv.js'
import Path from '../../utils/path.js'

const scaleZ = 0.5, maxVisualizationZ = 0.25
const indicatorColor = 0xFFFFFF, indicatorOpacity = 0.4, indicatorOpacityHighlighted = 1.0

let threeInstances = []
window.addEventListener('resize', function() {
	threeInstances.forEach(instance => instance.resize())
})

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
	computed: mapGetters(['isConnected']),
	data() {
		return {
			isActive: true,
			ready: false,
			loading: false,
			errorMessage: 'height map not available',

			colorScheme: 'terrain',
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
			numPoints: undefined,			// points excluding NaN
			area: undefined,
			radius: undefined,
			minDiff: undefined,
			maxDiff: undefined,
			meanError: undefined,
			rmsError: undefined
		}
	},
	methods: {
		...mapActions('machine', ['download']),
		init() {
			// Perform initial resize
			const size = this.resize();

			// Create THREE instances
			this.three.scene = new Scene();
			this.three.camera = new PerspectiveCamera(45, size.width / size.height, 0.1, 1000);
			this.three.camera.position.set(1, 1, 1);
			this.three.camera.up = new Vector3(0, 0, 1);
			this.three.renderer = new WebGLRenderer({ canvas: this.$refs.canvas });
			this.three.renderer.setSize(size.width, size.height);
			this.three.orbitControls = new OrbitControls(this.three.camera, this.three.renderer.domElement);
			this.three.raycaster = new Raycaster();

			// Register this instance in order to deal with size changes
			threeInstances.push(this);
			if (this.isConnected) {
				this.getHeightmap();
			}
		},
		resize() {
			if (!this.isActive) {
				return;
			}

			// Resize canvas elements
			const containerOffset = this.$refs.container.scrollWidth - this.$refs.container.offsetWidth;
			const width = this.$refs.parentElement.offsetWidth - this.$refs.legend.offsetWidth - containerOffset;
			const height = this.$refs.parentElement.offsetHeight;
			this.$refs.legend.height = height;
			this.$refs.canvas.width = width;
			this.$refs.canvas.height = height;

			// Resize the 3D height map
			if (this.three.renderer) {
				this.three.camera.aspect = width / height;
				this.three.camera.updateProjectionMatrix();
				this.three.renderer.setSize(width, height);
			}

			// Redraw the legend and return the canvas size
			drawLegend(this.$refs.legend, maxVisualizationZ, this.colorScheme);
			return { width, height };
		},
		showCSV(csvData) {
			// Load the CSV. The first line is a comment that can be removed
			const csv = new CSV(csvData.substr(csvData.indexOf("\n") + 1));
			const radius = parseFloat(csv.get('radius'));
			const xMin = parseFloat(csv.get('xmin'));
			const yMin = parseFloat(csv.get('ymin'));
			let xSpacing = parseFloat(csv.get('xspacing'));
			if (isNaN(xSpacing)) { xSpacing = parseFloat(csv.get('spacing')); }
			let ySpacing = parseFloat(csv.get('yspacing'));
			if (isNaN(ySpacing)) { ySpacing = parseFloat(csv.get('spacing')); }

			// Convert each point to a vector
			const points = [];
			for (let y = 1; y < csv.content.length; y++) {
				for (let x = 0; x < csv.content[y].length; x++) {
					const value = csv.content[y][x].trim();
					points.push([xMin + x * xSpacing, yMin + (y - 1) * ySpacing, (value === "0") ? NaN : parseFloat(value)]);
				}
			}

			// Display height map
			this.showHeightmap(points, radius);
		},
		showHeightmap(points, probeRadius) {
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
			this.three.meshGeometry = generateMeshGeometry(points, xMin, xMax, yMin, yMax, scaleZ);
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
			this.ready = true;
			this.resize();
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
				this.tooltip.coord.z = intersectionPoint.z;
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
		},

		async getHeightmap(filename = Path.heightmap) {
			if (this.loading) {
				// Don't attempt to load more than one file at once...
				return;
			}

			this.ready = false;
			this.loading = true;
			try {
				const heightmap = await this.download({ filename, type: 'text', showSuccess: false, showError: false });
				this.showCSV(heightmap);
			} catch (e) {
				console.warn(e);
				this.errorMessage = e.message;
			}
			this.loading = false;
		},

		testMesh() {
			const csvData = 'RepRapFirmware height map file v1\nxmin,xmax,ymin,ymax,radius,spacing,xnum,ynum\n-140.00,140.10,-140.00,140.10,150.00,20.00,15,15\n0,0,0,0,0,-0.139,-0.188,-0.139,-0.202,-0.224,0,0,0,0,0\n0,0,0,-0.058,-0.066,-0.109,-0.141,-0.129,-0.186,-0.198,-0.191,-0.176,0,0,0\n0,0,0.013,-0.008,-0.053,-0.071,-0.087,-0.113,-0.162,-0.190,-0.199,-0.267,-0.237,0,0\n0,0.124,0.076,0.025,-0.026,-0.054,-0.078,-0.137,-0.127,-0.165,-0.201,-0.189,-0.227,-0.226,0\n0,0.198,0.120,0.047,0.089,-0.074,-0.097,-0.153,-0.188,-0.477,-0.190,-0.199,-0.237,-0.211,0\n0.312,0.229,0.198,0.098,0.097,0.004,-0.089,-0.516,-0.150,-0.209,-0.197,-0.183,-0.216,-0.296,-0.250\n0.287,0.263,0.292,0.100,0.190,0.015,-0.102,-0.039,-0.125,-0.149,-0.137,-0.198,-0.188,-0.220,-0.192\n0.378,0.289,0.328,0.172,0.133,0.078,-0.086,0.134,-0.100,-0.150,-0.176,-0.234,-0.187,-0.199,-0.221\n0.360,0.291,0.260,0.185,0.111,0.108,0.024,0.073,-0.024,-0.116,-0.187,-0.252,-0.201,-0.215,-0.187\n0.447,0.397,0.336,0.276,0.180,0.164,0.073,-0.050,-0.049,-0.109,-0.151,-0.172,-0.211,-0.175,-0.161\n0,0.337,0.289,0.227,0.179,0.127,0.086,0.034,-0.039,-0.060,-0.113,-0.108,-0.171,-0.153,0\n0,0.478,0.397,0.374,0.270,0.141,0.085,0.074,0.037,-0.048,-0.080,-0.187,-0.126,-0.175,0\n0,0,0.373,0.364,0.265,0.161,0.139,0.212,0.040,0.046,-0.008,-0.149,-0.115,0,0\n0,0,0,0.346,0.295,0.273,0.148,0.136,0.084,0.024,-0.055,-0.078,0,0,0\n0,0,0,0,0,0.240,0.178,0.084,0.090,0.004,0,0,0,0,0';
			this.showCSV(csvData);
		},
		testBedCompensation(numPoints) {
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
			this.showHeightmap(testPoints);
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
		// FIXME give the grid some time to resize everything...
		setTimeout(this.init, 100);
	},
	beforeDestroy() {
		threeInstances = threeInstances.filter(item => item !== this);
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
		isConnected(to) {
			if (to) {
				this.getHeightmap();
			}
		}
	}
}
</script>
