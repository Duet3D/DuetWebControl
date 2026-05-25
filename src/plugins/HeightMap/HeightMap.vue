<template>
	<v-row class="ma-0">
		<v-col :class="{ 'pa-1': isXs }" cols="12" md="7" lg="auto" class="flex-grow-1 order-0">
			<div ref="container" class="heightmap-container">
				<div class="canvas-container" @mousemove="canvasMouseMove" @mouseleave="tooltip.shown = false">
					<canvas ref="canvas" />
					<canvas ref="legend" width="80" class="legend"
							:class="{ clickable: deviationColoring === 'fixed' }"
							:title="deviationColoring === 'fixed' ? $t('plugins.heightmap.scaleHint') : undefined"
							@click="onLegendClick" />
					<div v-if="tooltip.shown" class="hm-tooltip no-cursor"
						 :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
						<div>{{ xLabel }}: {{ display(tooltip.coord.x, 1, "mm") }}</div>
						<div>{{ yLabel }}: {{ display(tooltip.coord.y, 1, "mm") }}</div>
						<div>Z: {{ display(tooltip.coord.z, 3, "mm") }}</div>
					</div>
				</div>
			</div>
		</v-col>

		<v-col cols="12" md="5" lg="auto" class="heightmap-sidebar order-1">
			<v-row class="ma-0">
				<v-col cols="12" sm="6" md="12" class="pa-0">
					<v-card>
						<v-card-title class="d-flex align-center pt-2 pb-1">
							<v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
							{{ $t("plugins.heightmap.listTitle") }}
							<v-spacer />
							<v-icon class="ml-2" @click="refresh">mdi-refresh</v-icon>
						</v-card-title>
						<v-card-text v-if="files.length === 0" class="pa-0">
							<v-alert type="info" class="mb-0" :title="$t('plugins.heightmap.none')" />
						</v-card-text>
						<v-list v-else :disabled="uiStore.uiFrozen || !ready || loading" class="py-0"
								density="compact" mandatory>
							<v-list-item v-for="file in files" :key="file" :title="file"
										 :active="selectedFile === file" color="primary"
										 @click="selectedFile = file" />
						</v-list>
					</v-card>
				</v-col>

				<v-col cols="12" sm="6" md="12" class="pa-0 d-flex flex-column">
					<v-card class="d-flex flex-column flex-grow-0">
						<v-card-title class="pt-2 pb-1">
							<v-icon class="mr-2">mdi-information</v-icon>
							{{ $t("plugins.heightmap.statistics") }}
						</v-card-title>
						<v-card-text class="d-flex flex-column flex-grow-0 justify-space-between pt-2">
							<span>{{ $t("plugins.heightmap.numPoints", [display(numPoints, 0)]) }}</span>
							<span v-if="radius > 0">{{ $t("plugins.heightmap.radius", [display(radius, 0, "mm")]) }}</span>
							<span>{{ $t("plugins.heightmap.area", [display(area / 100, 1, "cm²")]) }}</span>
							<span>{{ $t("plugins.heightmap.maxDeviations", [display(minDiff, 3), display(maxDiff, 3, "mm")]) }}</span>
							<span>{{ $t("plugins.heightmap.meanError", [display(meanError, 3, "mm")]) }}</span>
							<span>{{ $t("plugins.heightmap.rmsError", [display(rmsError, 3, "mm")]) }}</span>
						</v-card-text>
					</v-card>

					<v-card class="d-flex flex-column mt-5">
						<v-card-title class="pt-2 pb-1">
							<v-icon class="mr-2">mdi-eye</v-icon>
							{{ $t("plugins.heightmap.display") }}
						</v-card-title>
						<v-card-text class="d-flex flex-column">
							<div class="d-flex flex-column mt-1">
								{{ $t("plugins.heightmap.colorScheme") }}
								<v-btn-toggle v-model="colorScheme" mandatory divided class="mt-1">
									<v-btn class="flex-grow-1" variant="outlined" value="terrain">{{ $t("plugins.heightmap.terrain") }}</v-btn>
									<v-btn class="flex-grow-1" variant="outlined" value="heat">{{ $t("plugins.heightmap.heat") }}</v-btn>
								</v-btn-toggle>
							</div>

							<div class="d-flex flex-column mt-1">
								{{ $t("plugins.heightmap.range") }}
								<v-btn-toggle v-model="deviationColoring" mandatory divided class="mt-1">
									<v-btn class="flex-grow-1" variant="outlined" value="fixed">{{ $t("plugins.heightmap.fixed") }}</v-btn>
									<v-btn class="flex-grow-1" variant="outlined" value="deviation">{{ $t("plugins.heightmap.deviation") }}</v-btn>
								</v-btn-toggle>
							</div>

							<v-switch v-model="invertZ" :disabled="uiStore.uiFrozen || loading || !ready"
									  :label="$t('plugins.heightmap.invertZ')" hide-details color="primary" />

							<v-btn :disabled="uiStore.uiFrozen || loading || !ready" variant="elevated"
								   class="ml-0 mt-3" @click="topView">
								<v-icon class="mr-1" size="small">mdi-format-vertical-align-bottom</v-icon>
								{{ $t("plugins.heightmap.topView") }}
							</v-btn>
							<v-btn :disabled="uiStore.uiFrozen || loading || !ready" variant="elevated"
								   class="ml-0 mt-3" @click="resetView">
								<v-icon class="mr-1" size="small">mdi-camera</v-icon>
								{{ $t("plugins.heightmap.resetView") }}
							</v-btn>
						</v-card-text>
					</v-card>
				</v-col>
			</v-row>
		</v-col>
	</v-row>

	<InputDialog v-model:shown="scaleDialogShown" :title="$t('plugins.heightmap.scaleDialogTitle')"
				 :prompt="$t('plugins.heightmap.scaleDialogPrompt')" :preset="fixedScale" is-numeric-value
				 @confirmed="onScaleConfirmed" />
</template>

<script setup lang="ts">
import type { Axis } from "@duet3d/objectmodel";
import { KinematicsName } from "@duet3d/objectmodel";
import { useDisplay } from "vuetify";

import InputDialog from "@/components/dialogs/InputDialog.vue";
import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import CSV from "@/utils/csv";
import { display } from "@/utils/display";
import Events from "@/utils/events";
import Path from "@/utils/path";

import type { HeightMapCoord } from "./3dbjs";
import HeightMapViewer from "./3dbjs";

interface FileEntry {
	isDirectory: boolean;
	name: string;
}

const machineStore = useMachineStore();
const cacheStore = useCacheStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const display_ = useDisplay();
const isXs = computed(() => display_.name.value === "xs");

// Register the per-plugin cache fields once. registerPluginData is idempotent so a second
// HeightMap mount in the same session reuses whatever the user already chose
cacheStore.registerPluginData("HeightMap", "colorScheme", "terrain");
cacheStore.registerPluginData("HeightMap", "deviationColoring", "fixed");
cacheStore.registerPluginData("HeightMap", "invertZ", false);
cacheStore.registerPluginData("HeightMap", "fixedScale", 0.25);

// #region Reactive state
const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const legend = ref<HTMLCanvasElement | null>(null);

const files = ref<Array<string>>([]);
const selectedFile = ref<string | null>(null);

const ready = ref(false);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const scaleDialogShown = ref(false);

const tooltip = reactive({
	coord: { x: 0, y: 0, z: 0 },
	x: 0,
	y: 0,
	shown: false,
});

const xLabel = ref("X");
const yLabel = ref("Y");
const numPoints = ref(0);
const area = ref(0);
const radius = ref(0);
const minDiff = ref<number | undefined>(undefined);
const maxDiff = ref<number | undefined>(undefined);
const meanError = ref<number | undefined>(undefined);
const rmsError = ref<number | undefined>(undefined);

let heightmapPoints: number[][][] | undefined = undefined;
let probeRadius: number | undefined = undefined;

let heightMapViewer: HeightMapViewer | undefined;

// #endregion

// #region Cached plugin settings (round-trip through the cache store)
const colorScheme = computed<string>({
	get: () => cacheStore.plugins.HeightMap?.colorScheme ?? "terrain",
	set: (value) => cacheStore.setPluginData("HeightMap", "colorScheme", value),
});

const deviationColoring = computed<string>({
	get: () => cacheStore.plugins.HeightMap?.deviationColoring ?? "fixed",
	set: (value) => cacheStore.setPluginData("HeightMap", "deviationColoring", value),
});

const invertZ = computed<boolean>({
	get: () => cacheStore.plugins.HeightMap?.invertZ ?? false,
	set: (value) => cacheStore.setPluginData("HeightMap", "invertZ", value),
});

// Half-range of the colour scale (mm) used when the range is set to "fixed"; editable by
// clicking the legend. The "deviation" range ignores this and derives the scale from the data
const fixedScale = computed<number>({
	get: () => cacheStore.plugins.HeightMap?.fixedScale ?? 0.25,
	set: (value) => cacheStore.setPluginData("HeightMap", "fixedScale", value),
});

// #endregion

// #region OM-derived values
const isConnected = computed(() => machineStore.isConnected);
const heightmapFile = computed(() => machineStore.model.move.compensation.file);
const systemDirectory = computed(() => machineStore.model.directories.system);
const axes = computed<Array<Axis>>(() => machineStore.model.move.axes);
const kinematicsName = computed(() => machineStore.model.move.kinematics.name);
const isDelta = computed(() => kinematicsName.value === KinematicsName.linearDelta
	|| kinematicsName.value === KinematicsName.rotaryDelta);
const bedAxesValues = computed(() => axes.value.map((a) => ({ letter: a.letter, min: a.min, max: a.max })));

// #endregion

// #region Sizing
function resize(): { width: number; height: number } | undefined {
	if (!container.value || !canvas.value || !legend.value) {
		return undefined;
	}

	const width = Math.max(container.value.offsetWidth - 80, 0);

	// App-bar height as published by Vuetify on <v-main> (64 px, or larger on sm touchscreens)
	const mainElement = document.querySelector(".v-main");
	const appBarHeight = mainElement
		? parseInt(getComputedStyle(mainElement).getPropertyValue("--v-layout-top")) || 64
		: 64;

	let height: number;
	switch (display_.name.value) {
		case "xs":
			height = width;
			break;
		case "sm":
			// Fill the viewport below the app bar; xs/sm chrome is just the app bar
			height = window.innerHeight - appBarHeight;
			break;
		case "md":
			// md uses the sidebar layout (file list + stats stacked on the right of the canvas),
			// so the canvas owns its column vertically the same way it does on lg+
			height = window.innerHeight - appBarHeight - 32;
			break;
		default:
			// lg+ runs all three columns side-by-side, so the canvas owns its column vertically
			// too. Fill the viewport (minus app bar + the layout's 16px top/bottom padding) so
			// the dark panel has even spacing top/bottom instead of dead space below
			height = window.innerHeight - appBarHeight - 32;
			break;
	}

	// Floor so a cramped window doesn't shrink the canvas into uselessness
	height = Math.max(height, 400);

	container.value.style.height = `${height}px`;
	legend.value.style.left = `${width}px`;
	legend.value.height = height;
	canvas.value.width = width;
	canvas.value.height = height;

	if (heightMapViewer) {
		heightMapViewer.resize();
		heightMapViewer.drawLegend(legend.value, colorScheme.value, invertZ.value, xLabel.value, yLabel.value);
	}

	return { width, height };
}

let resizeObserver: ResizeObserver | undefined;
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let wheelTarget: HTMLCanvasElement | null = null;
function preventWheelDefault(evt: WheelEvent) {
	evt.preventDefault();
}

function attachResizeObserver() {
	if (!container.value || resizeObserver) {
		return;
	}
	resizeObserver = new ResizeObserver(() => resize());
	resizeObserver.observe(container.value);
}

// #endregion

// #region File listing + loading
async function refresh() {
	if (!isConnected.value) {
		ready.value = false;
		errorMessage.value = null;
		selectedFile.value = null;
		files.value = [];
		return;
	}

	if (loading.value) {
		return;
	}

	loading.value = true;
	try {
		const list = (await machineStore.getFileList(systemDirectory.value)) as Array<FileEntry>;
		files.value = list
			.filter((file) => !file.isDirectory && file.name !== Path.filamentsFile && file.name.endsWith(".csv"))
			.map((file) => file.name)
			.sort();
	} finally {
		loading.value = false;
	}

	if (!files.value.includes(selectedFile.value ?? "")) {
		const liveName = heightmapFile.value ? Path.extractFileName(heightmapFile.value) : null;
		if (liveName && files.value.includes(liveName)) {
			selectedFile.value = liveName;
		} else if (files.value.includes(Path.heightmapFile)) {
			selectedFile.value = Path.heightmapFile;
		} else {
			selectedFile.value = null;
		}
	}
}

async function getHeightMap() {
	if (loading.value) {
		return;
	}

	ready.value = false;
	loading.value = true;
	try {
		if (selectedFile.value) {
			const heightmap = await machineStore.download({
				filename: Path.combine(systemDirectory.value, selectedFile.value),
				type: "text",
			}, false, false, false);
			showCSV(heightmap as string);
		} else {
			errorMessage.value = null;
		}
	} catch (e) {
		console.warn(e);
		errorMessage.value = (e as Error).message;
	}
	loading.value = false;
	ready.value = true;
}

function showCSV(csvData: string) {
	const csv = new CSV(csvData.substring(csvData.indexOf("\n") + 1));
	xLabel.value = csv.get("axis0") || "X";
	yLabel.value = csv.get("axis1") || "Y";

	let radiusValue: number | undefined = parseFloat(csv.get("radius") || "");
	if (Number.isNaN(radiusValue) || radiusValue <= 0) {
		radiusValue = undefined;
	}

	// Legacy CSVs used unprefixed `xmin`/`ymin`/`spacing`; newer ones use indexed keys
	let xMin = parseFloat(csv.get("min0") || "");
	if (Number.isNaN(xMin)) {
		xMin = parseFloat(csv.get("xmin") || "");
	}
	let yMin = parseFloat(csv.get("min1") || "");
	if (Number.isNaN(yMin)) {
		yMin = parseFloat(csv.get("ymin") || "");
	}
	let xSpacing = parseFloat(csv.get("spacing0") || "");
	if (Number.isNaN(xSpacing)) {
		xSpacing = parseFloat(csv.get("xspacing") || "");
	}
	if (Number.isNaN(xSpacing)) {
		xSpacing = parseFloat(csv.get("spacing") || "");
	}
	let ySpacing = parseFloat(csv.get("spacing1") || "");
	if (Number.isNaN(ySpacing)) {
		ySpacing = parseFloat(csv.get("yspacing") || "");
	}
	if (Number.isNaN(ySpacing)) {
		ySpacing = parseFloat(csv.get("spacing") || "");
	}

	const points: number[][][] = [];
	for (let y = 1; y < csv.content.length; y++) {
		const xpoints: number[][] = [];
		for (let x = 0; x < csv.content[y].length; x++) {
			const value = csv.content[y][x].trim();
			xpoints.push([xMin + x * xSpacing, yMin + (y - 1) * ySpacing, value === "0" ? NaN : parseFloat(value)]);
		}
		points.push(xpoints);
	}

	heightmapPoints = points;
	probeRadius = radiusValue;
	showHeightMap(points, radiusValue);
}

function showHeightMap(points: number[][][], probeRadius?: number) {
	if (!heightMapViewer || !legend.value) {
		return;
	}

	let xMin: number | undefined;
	let xMax: number | undefined;
	let yMin: number | undefined;
	let yMax: number | undefined;

	radius.value = probeRadius || 0;
	numPoints.value = 0;
	minDiff.value = undefined;
	maxDiff.value = undefined;
	let mean = 0;
	let rms = 0;

	for (let i = 0; i < points.length; i++) {
		for (let j = 0; j < points[i].length; j++) {
			const z = points[i][j][2];
			if (!Number.isNaN(z)) {
				const x = points[i][j][0];
				const y = points[i][j][1];
				if (xMin === undefined || xMin > x) { xMin = x; }
				if (xMax === undefined || xMax < x) { xMax = x; }
				if (yMin === undefined || yMin > y) { yMin = y; }
				if (yMax === undefined || yMax < y) { yMax = y; }

				numPoints.value++;
				mean += z;
				rms += z * z;
				if (minDiff.value === undefined || minDiff.value > z) { minDiff.value = z; }
				if (maxDiff.value === undefined || maxDiff.value < z) { maxDiff.value = z; }
			}
		}
	}

	area.value = probeRadius ? probeRadius * probeRadius * Math.PI
		: Math.abs(((xMax ?? 0) - (xMin ?? 0)) * ((yMax ?? 0) - (yMin ?? 0)));
	rmsError.value = numPoints.value > 0
		? Math.sqrt(rms * numPoints.value - mean * mean) / numPoints.value
		: 0;
	meanError.value = numPoints.value > 0 ? mean / numPoints.value : 0;

	heightMapViewer.renderHeightMap(points, invertZ.value, colorScheme.value, deviationColoring.value, fixedScale.value);
	heightMapViewer.drawLegend(legend.value, colorScheme.value, invertZ.value, xLabel.value, yLabel.value);
}

// #endregion

// #region Viewer interactions
function canvasMouseMove(e: MouseEvent) {
	const target = e.currentTarget as HTMLElement;
	const rect = target.getBoundingClientRect();
	tooltip.x = e.clientX - rect.left + 12;
	tooltip.y = e.clientY - rect.top + 12;
}

// The legend doubles as the entry point for editing the fixed colour scale; the deviation
// range derives its scale from the data, so the legend is inert in that mode
function onLegendClick() {
	if (deviationColoring.value === "fixed") {
		scaleDialogShown.value = true;
	}
}

function onScaleConfirmed(value: string | number) {
	const scale = typeof value === "string" ? parseFloat(value) : value;
	if (isFinite(scale) && scale > 0) {
		fixedScale.value = scale;
	}
}

function topView() {
	heightMapViewer?.topView();
}

function resetView() {
	heightMapViewer?.resetCamera();
}

function buildBed() {
	if (!heightMapViewer || !axes.value) {
		return;
	}
	for (const axis of axes.value) {
		if ("XYZ".includes(axis.letter)) {
			const letter = axis.letter.toLowerCase() as "x" | "y" | "z";
			heightMapViewer.buildVolume[letter].min = axis.min;
			heightMapViewer.buildVolume[letter].max = axis.max;
		}
	}
	heightMapViewer.renderBed();
	heightMapViewer.resetCamera();
}

function filesOrDirectoriesChanged(payload: { files?: Array<string>; volume?: number }) {
	const changedFiles = payload.files;
	if (changedFiles === undefined) {
		return;
	}
	if (selectedFile.value && changedFiles.includes(Path.combine(systemDirectory.value, selectedFile.value))) {
		// Active heightmap was touched; refresh both the chart and the listing
		getHeightMap().then(refresh);
	} else if (changedFiles.some((f) => f.endsWith(".csv")) && Path.filesAffectDirectory(changedFiles, systemDirectory.value)) {
		refresh();
	}
}

// #endregion

// #region Lifecycle
// Create the Babylon viewer + its surrounding DOM observers. Called on first mount AND on each
// keep-alive re-activation; pairs with destroyViewer() which fires on deactivate/unmount. We
// can't just keep the viewer alive across activations because Babylon's AdvancedDynamicTexture
// reuses the canvas dimensions at the moment of creation - after a few mounts the texture's
// internal resolution drifts upward and the axis labels render larger each time. Tearing the
// viewer down and rebuilding it on every show keeps the rendering deterministic
async function createViewer(): Promise<void> {
	if (heightMapViewer || !canvas.value || !legend.value) {
		return;
	}

	const size = resize();
	if (size && size.height <= 0) {
		size.height = 1;
	}
	attachResizeObserver();

	heightMapViewer = new HeightMapViewer(canvas.value);
	heightMapViewer.isDelta = isDelta.value;
	// Seed the scale so the legend is correct even before a height map is selected
	heightMapViewer.maxVisualizationZ = fixedScale.value;
	await heightMapViewer.init();
	buildBed();

	heightMapViewer.labelCallback = (metadata?: HeightMapCoord) => {
		if (metadata) {
			tooltip.coord.x = metadata.x;
			tooltip.coord.y = metadata.y;
			tooltip.coord.z = metadata.z;
			tooltip.shown = true;
		} else {
			tooltip.shown = false;
		}
	};

	if (isConnected.value) {
		refresh();
	}

	// Block wheel-zoom on the canvas itself so the Babylon scene gets the event instead of the
	// surrounding page scroll. Track the canvas reference so we can detach the listener on
	// teardown and avoid leaving the GC with a closure that references it
	wheelTarget = canvas.value;
	wheelTarget.addEventListener("wheel", preventWheelDefault);

	// One delayed resize catches Vuetify layout settling that the first synchronous resize misses
	settleTimer = setTimeout(() => {
		settleTimer = null;
		resize();
	}, 1000);
	ready.value = true;
}

function destroyViewer(): void {
	if (settleTimer !== null) {
		clearTimeout(settleTimer);
		settleTimer = null;
	}
	if (wheelTarget) {
		wheelTarget.removeEventListener("wheel", preventWheelDefault);
		wheelTarget = null;
	}
	resizeObserver?.disconnect();
	resizeObserver = undefined;
	heightMapViewer?.dispose();
	heightMapViewer = undefined;
	ready.value = false;
}

onMounted(() => {
	Events.on("filesOrDirectoriesChanged", filesOrDirectoriesChanged);
	createViewer();
});

// keep-alive lifecycle: deactivate when navigating away, activate when navigating back
onActivated(() => {
	createViewer();
});
onDeactivated(() => {
	destroyViewer();
});

onBeforeUnmount(() => {
	Events.off("filesOrDirectoriesChanged", filesOrDirectoriesChanged);
	destroyViewer();
});

// #endregion

// #region Watches
watch([colorScheme, deviationColoring, invertZ, fixedScale], () => {
	if (heightmapPoints) {
		showHeightMap(heightmapPoints, probeRadius);
	}
});

watch(files, () => nextTick(() => resize()));

watch(isConnected, () => refresh());

watch(heightmapFile, async (to) => {
	if (!to) {
		return;
	}
	await refresh();
	const fileName = Path.extractFileName(to);
	if (selectedFile.value === fileName) {
		await getHeightMap();
	} else {
		selectedFile.value = fileName;
	}
});

watch(selectedFile, () => getHeightMap());
watch(systemDirectory, () => refresh());

watch(() => settingsStore.locale, () => {
	if (heightMapViewer && legend.value) {
		heightMapViewer.drawLegend(legend.value, colorScheme.value, invertZ.value, xLabel.value, yLabel.value);
	}
});

watch(bedAxesValues, () => buildBed(), { deep: true });

watch(isDelta, (to) => {
	if (heightMapViewer) {
		heightMapViewer.isDelta = to;
		if (heightmapPoints) {
			showHeightMap(heightmapPoints, probeRadius);
		}
	}
});

// #endregion
</script>

<style scoped>
.heightmap-container {
	background-color: #000;
	color: #fff;
	border-radius: 8px;
	display: flex;
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

.canvas-container > .legend {
	right: 0;
}

.legend.clickable {
	cursor: pointer;
}

.no-cursor {
	pointer-events: none;
}

.hm-tooltip {
	position: absolute;
	background: rgba(0, 0, 0, 0.7);
	color: #fff;
	padding: 4px 8px;
	border-radius: 4px;
	font-size: 12px;
	white-space: nowrap;
	z-index: 5;
}
</style>
