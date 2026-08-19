<template>
	<v-dialog v-model="dialogShown" max-width="640px" no-click-animation :persistent="currentPage === 'collection' && !finished">
		<v-card>
			<v-card-title>
				<v-icon class="mr-2">mdi-record</v-icon>
				{{ $t("plugins.accelerometer.title") }}
			</v-card-title>

			<v-card-text class="pb-0">
				<v-window v-model="currentPage" :touch="false">
					<!-- Pre-flight -->
					<v-window-item value="start">
						{{ $t("plugins.accelerometer.intro") }}

						<ul class="mt-3 mb-4">
							<li>{{ $t("plugins.accelerometer.profileNumber", [run]) }}</li>
							<li>{{ $t("plugins.accelerometer.inputShaper", [shaperLabel]) }}</li>
							<li v-if="frequencyLabel">{{ $t("plugins.accelerometer.shaperFrequencyValue", [frequencyLabel]) }}</li>
							<li v-if="dampingLabel">{{ $t("plugins.accelerometer.dampingFactorValue", [dampingLabel]) }}</li>
							<li v-if="amplitudesLabel">{{ $t("plugins.accelerometer.amplitudesValue", [amplitudesLabel]) }}</li>
							<li v-if="delaysLabel">{{ $t("plugins.accelerometer.delaysValue", [delaysLabel]) }}</li>
						</ul>

						<v-alert v-if="accelerometers.length === 0" type="error" variant="tonal" class="my-3"
								 density="compact">
							{{ $t("plugins.accelerometer.noAccelerometer") }}
							<a href="https://docs.duet3d.com/User_manual/Connecting_hardware/Sensors_Accelerometer"
							   target="_blank" class="float-right">
								{{ $t("plugins.accelerometer.help") }}
							</a>
						</v-alert>
						<v-alert v-if="!allAxesHomed" type="warning" variant="tonal" class="my-3" density="compact">
							<div class="d-flex align-center">
								{{ $t("plugins.accelerometer.notHomed") }}
								<v-spacer />
								<CodeButton code="G28" size="small" color="warning" variant="flat" class="ml-3">
									{{ $t("plugins.accelerometer.homeAll") }}
								</CodeButton>
							</div>
						</v-alert>
						<v-alert v-if="accelerometers.length > 0 && allAxesHomed" type="success" variant="tonal"
								 density="compact" class="my-3">
							{{ $t("plugins.accelerometer.readyToRecord") }}
						</v-alert>

						<span v-if="accelerometers.length > 0 && allAxesHomed">
							{{ $t("plugins.accelerometer.pressNext") }}
						</span>
					</v-window-item>

					<!-- Move configuration -->
					<v-window-item value="config">
						<div class="d-flex flex-column">
							{{ $t("plugins.accelerometer.defineMoves") }}

							<v-table density="compact" class="mt-1">
								<thead>
									<tr>
										<th class="px-0">{{ $t("plugins.accelerometer.tool") }}</th>
										<th>{{ $t("plugins.accelerometer.accelerometer") }}</th>
										<th class="px-0">{{ $t("plugins.accelerometer.axis") }}</th>
										<th class="pr-0">{{ $t("plugins.accelerometer.startPosition") }}</th>
										<th>{{ $t("plugins.accelerometer.endPosition") }}</th>
										<th />
									</tr>
								</thead>
								<tbody>
									<tr v-for="(move, index) in moves" :key="index">
										<td class="px-0">
											<v-select :model-value="toolIndex(move)" :items="toolList"
													  item-title="title" item-value="index" density="compact"
													  variant="plain" hide-details
													  @update:model-value="(idx) => setMoveTool(move, toolFromIndex(idx as number))" />
										</td>
										<td>
											<v-select v-model="move.accelerometer" :items="accelerometers"
													  density="compact" variant="plain" hide-details />
										</td>
										<td class="px-0">
											<v-select :model-value="move.axis" :items="['X', 'Y', 'X+Y']"
													  density="compact" variant="plain" hide-details
													  @update:model-value="(v) => setMoveAxis(move, v as string)" />
										</td>
										<td class="pr-0">
											<v-text-field v-model.number="move.start" type="number"
														  :min="getMin(move, true) ?? undefined"
														  :max="getMax(move, true) ?? undefined"
														  density="compact" variant="plain" hide-details />
										</td>
										<td>
											<v-text-field v-model.number="move.end" type="number"
														  :min="getMin(move, false) ?? undefined"
														  :max="getMax(move, false) ?? undefined"
														  density="compact" variant="plain" hide-details />
										</td>
										<td class="px-0">
											<v-btn color="warning" variant="outlined" size="small"
												   :disabled="moves.length <= 1" @click="removeMove(index)">
												<v-icon>mdi-delete</v-icon>
											</v-btn>
										</td>
									</tr>
								</tbody>
							</v-table>
							<v-divider class="mb-3" />

							<v-btn color="card-actions" variant="outlined" class="mx-auto" @click="addMove">
								<v-icon class="mr-1">mdi-plus</v-icon>
								{{ $t("plugins.accelerometer.addMove") }}
							</v-btn>

							<v-alert v-if="hasExternalAccelerometers" type="info" variant="tonal" density="compact"
									 class="mt-3">
								{{ $t("plugins.accelerometer.externalAccelerometersHint") }}
							</v-alert>

							<v-checkbox v-model="centerAxes" :label="$t('plugins.accelerometer.centreUnusedAxes')"
										color="primary" hide-details class="my-2" />
							<div v-if="centerAxes" class="mx-9 d-flex flex-wrap">
								<v-text-field v-model.number="xAxisCenter" type="number" step="1"
											  :min="xAxis.min" :max="xAxis.max"
											  :label="$t('plugins.accelerometer.xCentre')" density="compact"
											  variant="outlined" hide-details class="me-3 mb-2" style="max-width: 12rem" />
								<v-text-field v-model.number="yAxisCenter" type="number" step="1"
											  :min="yAxis.min" :max="yAxis.max"
											  :label="$t('plugins.accelerometer.yCentre')" density="compact"
											  variant="outlined" hide-details class="me-3 mb-2" style="max-width: 12rem" />
								<v-text-field v-if="showZCenter" v-model.number="zAxisCenter" type="number" step="1"
											  :min="zAxis.min" :max="zAxis.max"
											  :label="$t('plugins.accelerometer.zCentre')" density="compact"
											  variant="outlined" hide-details class="mb-2" style="max-width: 12rem" />
							</div>
							<v-checkbox v-model="recordWholeMove" :label="$t('plugins.accelerometer.captureWholeMove')"
										color="primary" hide-details class="my-2" />

							{{ $t("plugins.accelerometer.nextStarts") }}
						</div>
					</v-window-item>

					<!-- Data collection -->
					<v-window-item value="collection">
						<span v-if="!finished">{{ $t("plugins.accelerometer.standBy") }}</span>

						<v-table density="compact" class="mt-1">
							<thead>
								<tr>
									<th class="px-0" />
									<th>{{ $t("plugins.accelerometer.tool") }}</th>
									<th class="px-0">{{ $t("plugins.accelerometer.accelerometer") }}</th>
									<th>{{ $t("plugins.accelerometer.axis") }}</th>
									<th class="px-0">{{ $t("plugins.accelerometer.startPosition") }}</th>
									<th>{{ $t("plugins.accelerometer.endPosition") }}</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(move, index) in moves" :key="index">
									<td class="px-0"><v-icon>{{ getMoveIcon(move) }}</v-icon></td>
									<td>{{ move.tool ? (move.tool.name || `T${move.tool.number}`) : "None" }}</td>
									<td class="px-0">{{ move.accelerometer }}</td>
									<td>{{ move.axis }}</td>
									<td class="px-0">{{ move.start }}</td>
									<td>{{ move.end }}</td>
								</tr>
							</tbody>
						</v-table>
						<v-divider />

						<v-alert v-if="cancelled" type="error" variant="tonal" density="compact" class="mt-3">
							{{ $t("plugins.accelerometer.cancelled") }}
						</v-alert>
						<v-alert v-if="finished && !cancelled" type="success" variant="tonal" density="compact"
								 class="mt-3">
							{{ $t("plugins.accelerometer.completed", [run]) }}
						</v-alert>
					</v-window-item>
				</v-window>
			</v-card-text>

			<v-card-actions>
				<v-btn v-if="!cancelled && !finished" variant="text" @click="cancel">
					{{ $t("generic.cancel") }}
				</v-btn>
				<v-spacer />
				<v-btn v-if="canGoBack" variant="text" @click="goBack">
					{{ $t("plugins.accelerometer.back") }}
				</v-btn>
				<v-btn v-if="currentPage !== 'collection'" variant="text"
					   :disabled="!canGoNext" @click="goNext">
					{{ $t("plugins.accelerometer.next") }}
				</v-btn>
				<v-btn v-if="cancelled || finished" variant="text"
					   @click="dialogShown = false">
					{{ $t("plugins.accelerometer.finish") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { OperationCancelledError } from "@duet3d/connectors";
import { Axis, KinematicsName, MachineStatus, type Tool } from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";

import { useAccelerometer } from "./useAccelerometer";

const MoveState = {
	idle: "idle",
	recording: "recording",
	finished: "finished",
	cancelled: "cancelled",
} as const;

type MoveStateKey = typeof MoveState[keyof typeof MoveState];

interface MoveItem {
	state: MoveStateKey;
	tool: Tool | null;
	accelerometer: string | null;
	axis: string;
	start: number;
	end: number;
}

const props = defineProps<{
	lastRun: number;
}>();

const dialogShown = defineModel<boolean>("shown", { required: true });

const emit = defineEmits<{
	finished: [];
}>();

const machineStore = useMachineStore();
const { accelerometers, hasExternalAccelerometers, doCode, waitForAccelerometerRun, getCollectionRate } = useAccelerometer();

// #region OM-derived computeds
const move = computed(() => machineStore.model.move);
const tools = computed(() => machineStore.model.tools);
const machineState = computed(() => machineStore.model.state);

const xAxis = computed<Axis>(() => move.value.axes.find((a) => a.letter === "X") ?? new Axis());
const yAxis = computed<Axis>(() => move.value.axes.find((a) => a.letter === "Y") ?? new Axis());
const zAxis = computed<Axis>(() => move.value.axes.find((a) => a.letter === "Z") ?? new Axis());

const shaperLabel = computed(() => {
	const type = move.value.shaping.type;
	if (type === "none") {
		return "None";
	}
	if (type === "custom") {
		return "Custom";
	}
	return (type as string).toUpperCase();
});

const frequencyLabel = computed(() => {
	const type = move.value.shaping.type;
	return type === "none" || type === "custom" ? null : `${move.value.shaping.frequency}Hz`;
});

const dampingLabel = computed(() => {
	const type = move.value.shaping.type;
	return type === "none" || type === "custom" ? null : move.value.shaping.damping.toString();
});

const amplitudesLabel = computed(() => {
	return move.value.shaping.type === "custom"
		? move.value.shaping.amplitudes.map((a) => a.toString()).join(", ")
		: null;
});

const delaysLabel = computed(() => {
	return move.value.shaping.type === "custom"
		? move.value.shaping.delays.map((d) => `${(d / 1000).toFixed(3)}ms`).join(", ")
		: null;
});

const allAxesHomed = computed(() => !move.value.axes.some((axis) => axis.visible && !axis.homed));

// VSelect's value-comparator path gets tangled when items reference live OM Tool instances, so
// expose a numeric index per option instead and round-trip the Tool through toolFromIndex
const toolList = computed<Array<{ title: string; index: number }>>(() => {
	const list: Array<{ title: string; index: number }> = [{ title: "None", index: -1 }];
	for (const tool of tools.value) {
		if (tool) {
			list.push({ title: tool.name || tool.number.toString(), index: tool.number });
		}
	}
	return list;
});

function toolFromIndex(index: number): Tool | null {
	if (index === -1) {
		return null;
	}
	for (const tool of tools.value) {
		if (tool && tool.number === index) {
			return tool;
		}
	}
	return null;
}

function toolIndex(m: MoveItem): number {
	return m.tool ? m.tool.number : -1;
}

const showZCenter = computed(() => [KinematicsName.linearDelta, KinematicsName.rotaryDelta, KinematicsName.coreXZ]
	.includes(move.value.kinematics.name));

// Wider X+Y diagonal moves need sqrt(2) extra speed budget to stay at maxSpeed component-wise
const maxSpeed = computed(() => {
	let max = 6000;
	for (const axis of move.value.axes) {
		if (axis.speed > max) {
			max = axis.speed;
		}
	}
	return moves.value.some((m) => m.axis.length > 1) ? Math.round(max * Math.sqrt(2)) : max;
});

// #endregion

// #region Wizard state
const currentPage = ref<"start" | "config" | "collection">("start");
const moves = ref<Array<MoveItem>>([]);
const centerAxes = ref(true);
const xAxisCenter = ref(0);
const yAxisCenter = ref(0);
const zAxisCenter = ref(0);
const recordWholeMove = ref(true);
const run = ref(0);
const finished = ref(false);
const cancelled = ref(false);

const canGoBack = computed(() => currentPage.value === "config");

const canGoNext = computed(() => {
	if (currentPage.value === "start") {
		return accelerometers.value.length > 0 && allAxesHomed.value;
	}
	if (currentPage.value === "config") {
		for (const m of moves.value) {
			if (!m.accelerometer || !m.axis || m.start >= m.end) {
				return false;
			}
			if (m.start < (getMin(m, true) ?? -Infinity) || m.start > (getMax(m, true) ?? Infinity)) return false;
			if (m.end < (getMin(m, false) ?? -Infinity) || m.end > (getMax(m, false) ?? Infinity)) return false;
		}
		if (moves.value.length === 0) {
			return false;
		}
		if (!centerAxes.value) {
			return true;
		}
		const xOK = !Number.isNaN(xAxisCenter.value) && xAxisCenter.value >= xAxis.value.min && xAxisCenter.value < xAxis.value.max;
		const yOK = !Number.isNaN(yAxisCenter.value) && yAxisCenter.value >= yAxis.value.min && yAxisCenter.value < yAxis.value.max;
		const zOK = !showZCenter.value || (!Number.isNaN(zAxisCenter.value) && zAxisCenter.value >= zAxis.value.min && zAxisCenter.value < zAxis.value.max);
		return xOK && yOK && zOK;
	}
	return false;
});

// #endregion

// #region Move building helpers
function refreshCenters() {
	if (currentPage.value === "collection") {
		return;
	}
	xAxisCenter.value = (xAxis.value.min + xAxis.value.max) / 2;
	yAxisCenter.value = (yAxis.value.min + yAxis.value.max) / 2;
	zAxisCenter.value = (zAxis.value.min + zAxis.value.max) / 2;
}

function makeMoves() {
	if (currentPage.value === "collection") {
		return;
	}
	moves.value = move.value.axes
		.filter((axis) => axis.letter === "X" || axis.letter === "Y")
		.map((axis) => ({
			state: MoveState.idle,
			tool: null,
			accelerometer: accelerometers.value.length > 0 ? accelerometers.value[0] : null,
			axis: axis.letter,
			start: Math.round((axis.min + axis.max) / 2 - (axis.max - axis.min) / 4),
			end: Math.round((axis.min + axis.max) / 2 + (axis.max - axis.min) / 4),
		}));
}

function addMove() {
	const x = move.value.axes.find((a) => a.letter === "X");
	moves.value.push({
		state: MoveState.idle,
		tool: null,
		accelerometer: accelerometers.value.length > 0 ? accelerometers.value[0] : null,
		axis: "X",
		start: x ? Math.round((x.min + x.max) / 2 - (x.max - x.min) / 4) : 0,
		end: x ? Math.round((x.min + x.max) / 2 + (x.max - x.min) / 4) : 0,
	});
}

function setMoveTool(m: MoveItem, tool: Tool | null) {
	const axisIndex = move.value.axes.findIndex((a) => a.letter === m.axis);
	if (axisIndex >= 0) {
		if (m.tool) {
			m.start -= m.tool.offsets[axisIndex];
			m.end -= m.tool.offsets[axisIndex];
		}
		if (tool) {
			m.start += tool.offsets[axisIndex];
			m.end += tool.offsets[axisIndex];
		}
	}
	m.tool = tool;
}

function setMoveAxis(m: MoveItem, axis: string) {
	const axisObj = move.value.axes.find((a) => a.letter === axis);
	if (axisObj) {
		const axisIndex = move.value.axes.findIndex((a) => a.letter === axis);
		m.start = Math.round((axisObj.min + axisObj.max) / 2 - (axisObj.max - axisObj.min) / 4);
		m.end = Math.round((axisObj.min + axisObj.max) / 2 + (axisObj.max - axisObj.min) / 4);
		if (m.tool) {
			m.start += m.tool.offsets[axisIndex];
			m.end += m.tool.offsets[axisIndex];
		}
	}
	m.axis = axis;
}

function removeMove(index: number) {
	moves.value.splice(index, 1);
}

function getMin(m: MoveItem, start: boolean): number | null {
	if (!m.axis) {
		return null;
	}
	let min: number | null = null;
	const axes = m.axis.split("+");
	for (const axis of move.value.axes) {
		if (axes.includes(axis.letter) && (min === null || min < axis.min)) {
			if (m.tool !== null) {
				if (axis.letter === "X") {
					min = axis.min + m.tool.offsets[0];
				} else if (axis.letter === "Y") {
					min = axis.min + m.tool.offsets[1];
				} else {
					min = axis.min;
				}
			} else {
				min = axis.min;
			}
		}
	}
	return start ? min : (min !== null ? Math.max(min, m.start ?? min) : null);
}

function getMax(m: MoveItem, start: boolean): number | null {
	if (!m.axis) {
		return null;
	}
	let max: number | null = null;
	const axes = m.axis.split("+");
	for (const axis of move.value.axes) {
		if (axes.includes(axis.letter) && (max === null || max > axis.max)) {
			if (m.tool !== null) {
				if (axis.letter === "X") {
					max = axis.max + m.tool.offsets[0];
				} else if (axis.letter === "Y") {
					max = axis.max + m.tool.offsets[1];
				} else {
					max = axis.max;
				}
			} else {
				max = axis.max;
			}
		}
	}
	return start ? (max !== null ? Math.min(max, m.end ?? max) : null) : max;
}

// #endregion

// #region Recording loop
// Duration of the recorded move at the configured max speed, capped by the slowest involved axis
function getMoveDuration(m: MoveItem): number {
	const axes = m.axis.split("+").map((letter) => move.value.axes.find((axis) => axis.letter === letter)).filter((axis): axis is Axis => !!axis);
	if (axes.length === 0) {
		return 1;
	}
	const distance = Math.abs(m.end - m.start) * Math.sqrt(axes.length), speed = Math.min(maxSpeed.value, ...axes.map((axis) => axis.speed)) / 60;
	const acceleration = Math.min(...axes.map((axis) => axis.acceleration)), rampTime = speed / acceleration, rampDistance = speed * rampTime / 2;
	return (2 * rampDistance >= distance) ? 2 * Math.sqrt(distance / acceleration) : 2 * rampTime + (distance - 2 * rampDistance) / speed;
}

function getMoveFilename(m: MoveItem): string {
	let filename = run.value.toString();
	if (m.tool) {
		filename += `-T${m.tool.number}`;
	}
	filename += `-${m.axis.replace(/\+/g, "")}${m.start}-${m.end}-${m.accelerometer}-${move.value.shaping.type}`;
	if (move.value.shaping.type !== "none" && move.value.shaping.type !== "custom") {
		filename += `-${move.value.shaping.frequency}Hz-${move.value.shaping.damping}`;
	}
	filename += ".csv";
	return filename;
}

async function recordMove(moveIndex: number, hadSelectedTool = false) {
	const m = moves.value[moveIndex];
	m.state = MoveState.recording;

	try {
		if (m.tool) {
			await doCode(`T${m.tool.number}`);
			hadSelectedTool = true;
		} else if (hadSelectedTool) {
			await doCode("T-1");
			hadSelectedTool = false;
		}
		if (cancelled.value) {
			m.state = MoveState.cancelled;
			throw new OperationCancelledError();
		}

		const moveAxes = m.axis.split("+");
		let startParams = moveAxes.map((axis) => `${axis}${m.start}`).join(" ");
		if (centerAxes.value) {
			if (!moveAxes.includes("X")) {
				startParams += m.tool ? ` X${xAxisCenter.value + m.tool.offsets[0]}` : ` X${xAxisCenter.value}`;
			}
			if (!moveAxes.includes("Y")) {
				startParams += m.tool ? ` Y${yAxisCenter.value + m.tool.offsets[1]}` : ` Y${yAxisCenter.value}`;
			}
			if (showZCenter.value) {
				startParams += m.tool ? ` Z${zAxisCenter.value + m.tool.offsets[2]}` : ` Z${zAxisCenter.value}`;
			}
		}
		await doCode(`G1 ${startParams} F${maxSpeed.value}`);
		if (machineStore.isStandaloneMode) {
			// In standalone mode the code reply does not wait for the move, so give it time to finish before the M400 M956 line is sent
			await doCode("G4 S1");
		}
		if (cancelled.value) {
			m.state = MoveState.cancelled;
			throw new OperationCancelledError();
		}

		// Record 0.75s of ringing (plus the move itself if requested) so that the frequency resolution does not depend on the sampling rate
		const samplingRate = getCollectionRate(m.accelerometer!);
		const endParams = moveAxes.map((axis) => `${axis}${m.end}`).join(" ");
		if (recordWholeMove.value) {
			const numSamples = Math.ceil(1.05 * samplingRate * (getMoveDuration(m) + 0.75));
			await doCode(`M400 M956 P${m.accelerometer} S${numSamples} A0 F"${getMoveFilename(m)}" G1 ${endParams} F${maxSpeed.value}`);
		} else {
			await doCode(`G1 ${endParams} F${maxSpeed.value} M400 M956 P${m.accelerometer} S${Math.ceil(samplingRate * 0.75)} A0 F"${getMoveFilename(m)}"`);
		}
		await waitForAccelerometerRun(m.accelerometer!, cancelled);

		m.state = MoveState.finished;
		if (moveIndex + 1 < moves.value.length) {
			await recordMove(moveIndex + 1, hadSelectedTool);
		} else {
			if (!cancelled.value) {
				emit("finished");
			}
			finished.value = true;
		}
	} catch (e) {
		console.warn(`Sampling cancelled at move #${moveIndex}: ${(e as Error).message || e}`);
		m.state = MoveState.cancelled;
		cancelled.value = true;
	}
}

function getMoveIcon(m: MoveItem): string {
	switch (m.state) {
		case MoveState.idle: return "mdi-asterisk";
		case MoveState.recording: return "mdi-play";
		case MoveState.finished: return "mdi-check";
		case MoveState.cancelled: return "mdi-close";
	}
	return "mdi-help-circle-outline";
}

function cancel() {
	if (currentPage.value === "collection" && !cancelled.value) {
		cancelled.value = true;
		finished.value = true;
	} else {
		dialogShown.value = false;
	}
}

function goBack() {
	if (currentPage.value === "config") {
		currentPage.value = "start";
	}
}

function goNext() {
	if (currentPage.value === "start") {
		moves.value.forEach((m) => { m.state = MoveState.idle; });
		currentPage.value = "config";
	} else if (currentPage.value === "config") {
		currentPage.value = "collection";
		cancelled.value = false;
		recordMove(0);
	}
}

onMounted(() => {
	run.value = props.lastRun + 1;
	refreshCenters();
	makeMoves();
});

watch(accelerometers, () => makeMoves());
watch(() => xAxis.value.min, () => { makeMoves(); refreshCenters(); });
watch(() => xAxis.value.max, () => { makeMoves(); refreshCenters(); });
watch(() => yAxis.value.min, () => { makeMoves(); refreshCenters(); });
watch(() => yAxis.value.max, () => { makeMoves(); refreshCenters(); });
watch(() => zAxis.value.min, () => refreshCenters());
watch(() => zAxis.value.max, () => refreshCenters());

watch(dialogShown, (to) => {
	if (to) {
		run.value = props.lastRun + 1;
	} else {
		if (currentPage.value === "collection") {
			cancelled.value = true;
		}
		currentPage.value = "start";
		cancelled.value = false;
		finished.value = false;
	}
});

watch(() => machineState.value.status, (to) => {
	if ((to === MachineStatus.disconnected || to === MachineStatus.off) && currentPage.value === "collection") {
		cancelled.value = true;
	}
});

// #endregion
</script>
