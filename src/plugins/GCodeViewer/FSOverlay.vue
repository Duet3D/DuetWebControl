<style scoped>
/* The overlay only renders inside GCodeViewer's fullscreen mode (the v-show guard at
   GCodeViewer.vue's <FSOverlay v-show="fullscreen && showOverlay">), so the fixed positioning
   is anchored to a viewport that's already taken over by the .full-screen wrapper - no app-bar
   overlap risk. z-index 5 keeps it above the canvas but below Vuetify's overlay stack */
.overlay-container {
	position: fixed;
	inset: 0;
	width: 100%;
	height: 100%;
	z-index: 5;
	pointer-events: none;
}

.axes-container,
.axes-container-viewgcode,
.heater-container,
.heater-container-viewgcode {
	pointer-events: auto;
}

.axes-container { position: fixed; left: 50%; }
.axes-container-viewgcode { position: fixed; right: 50%; }

.heater-container {
	position: fixed;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 200px;
	text-align: center;
	font-size: large;
}

.heater-container-viewgcode {
	position: fixed;
	right: 30.5%;
	top: 50%;
	transform: translateY(-50%);
	width: 200px;
	text-align: center;
	font-size: large;
}

.axes {
	position: relative;
	top: 10px;
	left: -50%;
	text-align: center;
	font-size: large;
	width: 300px;
}
</style>

<template>
	<div ref="overlay" class="overlay-container">
		<div :class="viewgcode ? 'axes-container-viewgcode' : 'axes-container'">
			<v-card class="axes">
				<v-card-text>
					<strong>Tool Position</strong>
					<v-row no-gutters>
						<v-col v-for="(axis, index) in visibleAxes" :key="index" class="d-flex flex-column align-center">
							<strong>{{ axis.letter }}</strong>
							<span>{{ displayAxisPosition(axis) }}</span>
						</v-col>
					</v-row>
				</v-card-text>
			</v-card>
		</div>

		<div :class="viewgcode ? 'heater-container-viewgcode' : 'heater-container'">
			<v-card v-show="heat.heaters.length > 0">
				<v-card-text>
					<strong>Temperatures</strong>

					<template v-for="tool in toolsFiltered" :key="tool.number">
						<v-row v-for="(heaterIdx, idx) in tool.heaters" :key="`Tool ${tool.number * 10 + idx}`"
							   density="compact" class="align-center justify-center">
							<template v-if="heaterIdx >= 0">
								<v-col cols="12">
									<GaugeComponent v-if="getHeaterInfo(heaterIdx)" class="gauges"
										:max="getHeaterInfo(heaterIdx)!.max" :curval="getHeaterInfo(heaterIdx)!.current"
										:settemp="tool.active[0]" :label="getToolLabel(tool)"
										:state="getHeaterInfo(heaterIdx)!.state" />
								</v-col>
							</template>
						</v-row>
					</template>

					<template v-for="(heaterIndices, idx) in machineStore.bedHeaterMapping" :key="`bed-${idx}`">
						<v-row v-for="(heaterIdx, subIdx) in heaterIndices" :key="`bed${idx}-${subIdx}`"
							   density="compact" class="align-center justify-center">
							<template v-if="heaterIdx >= 0">
								<v-col cols="12">
									<GaugeComponent v-if="getHeaterInfo(heaterIdx)" class="gauges" :max="120"
										:curval="getHeaterInfo(heaterIdx)!.current"
										:settemp="getHeaterInfo(heaterIdx)!.active"
										:label="getBedLabel(idx)"
										:state="getHeaterInfo(heaterIdx)!.state" />
								</v-col>
							</template>
						</v-row>
					</template>

					<template v-for="(heaterIndices, idx) in machineStore.chamberHeaterMapping" :key="`chamber-${idx}`">
						<v-row v-for="(heaterIdx, subIdx) in heaterIndices" :key="`chamber${idx}-${subIdx}`"
							   density="compact" class="align-center justify-center">
							<template v-if="heaterIdx >= 0">
								<v-col cols="12">
									<GaugeComponent v-if="getHeaterInfo(heaterIdx)" class="gauges" :max="120"
										:curval="getHeaterInfo(heaterIdx)!.current"
										:settemp="getHeaterInfo(heaterIdx)!.active"
										:label="getChamberLabel(idx)"
										:state="getHeaterInfo(heaterIdx)!.state" />
								</v-col>
							</template>
						</v-row>
					</template>
				</v-card-text>
			</v-card>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Axis, Heater, Tool } from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";
import { display, displayZ } from "@/utils/display";

import GaugeComponent from "./Gauge/gauge.vue";

defineProps<{
	viewgcode?: boolean;
}>();

const machineStore = useMachineStore();

const move = computed(() => machineStore.model.move);
const heat = computed(() => machineStore.model.heat);
const tools = computed<Array<Tool | null>>(() => machineStore.model.tools);
const toolsFiltered = computed<Array<Tool>>(() => tools.value.filter((t): t is Tool => t !== null));

const visibleAxes = computed<Array<Axis>>(() => move.value.axes.filter((axis) => axis.visible));

function displayAxisPosition(axis: Axis): string {
	const position = axis.userPosition;
	return axis.letter === "Z" ? displayZ(position, false) : display(position, 1);
}

function getHeaterInfo(heaterIdx: number): Heater | null {
	return heat.value.heaters[heaterIdx];
}

function getToolLabel(tool: Tool): string {
	return tool.name === "" ? `Tool ${tool.number}` : tool.name;
}

// The mapping is padded with empty slots, so only slots with a heater count towards the labels
const bedCount = computed(() => machineStore.bedHeaterMapping.filter(heaterIndices => heaterIndices.some(getHeaterInfo)).length);
const chamberCount = computed(() => machineStore.chamberHeaterMapping.filter(heaterIndices => heaterIndices.some(getHeaterInfo)).length);

function getBedLabel(bedIdx: number): string {
	return (bedCount.value > 1) ? `Bed ${bedIdx}` : "Bed";
}

function getChamberLabel(chamberIdx: number): string {
	return (chamberCount.value > 1) ? `Chamber ${chamberIdx}` : "Chamber";
}
</script>
