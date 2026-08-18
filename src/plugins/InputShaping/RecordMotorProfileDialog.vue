<style scoped>
/* Compact plain fields reserve 8px of label space above the value, which pushes them below the plain text in the neighboring cells */
.v-table :deep(.v-input--density-compact) {
	--v-input-padding-top: 0px;
}
</style>

<template>
	<v-dialog v-model="dialogShown" max-width="720px" no-click-animation>
		<v-card>
			<v-card-title>
				<v-icon class="mr-2">mdi-record</v-icon>
				{{ $t("plugins.accelerometer.motorTitle") }}
			</v-card-title>

			<v-card-text class="pb-0">
				<v-window v-model="currentPage" :touch="false">
					<!-- Pre-flight -->
					<v-window-item value="start">
						{{ $t("plugins.accelerometer.motorIntro") }}

						<v-alert v-if="accelerometers.length === 0" type="error" variant="tonal" class="my-3" density="compact">
							{{ $t("plugins.accelerometer.noAccelerometer") }}
							<a href="https://docs.duet3d.com/User_manual/Connecting_hardware/Sensors_Accelerometer" target="_blank" class="float-right">
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
						<v-alert v-if="accelerometers.length > 0 && allAxesHomed" type="success" variant="tonal" density="compact" class="my-3">
							{{ $t("plugins.accelerometer.readyToRecord") }}
						</v-alert>

						<span v-if="accelerometers.length > 0 && allAxesHomed">
							{{ $t("plugins.accelerometer.pressNext") }}
						</span>
					</v-window-item>

					<!-- Move configuration -->
					<v-window-item value="config">
						<div class="d-flex flex-column">
							{{ $t("plugins.accelerometer.defineMotorMoves") }}

							<v-table density="compact" class="mt-1">
								<thead>
									<tr>
										<th class="px-0" />
										<th>{{ $t("plugins.accelerometer.motor") }}</th>
										<th class="px-0">{{ $t("plugins.accelerometer.direction") }}</th>
										<th>{{ $t("plugins.accelerometer.center") }}</th>
										<th class="px-0">{{ $t("plugins.accelerometer.length") }}</th>
										<th>{{ $t("plugins.accelerometer.accelerometer") }}</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="move in moves" :key="move.motor">
										<td class="px-0">
											<v-checkbox v-model="move.enabled" density="compact" hide-details color="primary" />
										</td>
										<td>{{ move.motor }}</td>
										<td class="px-0 text-no-wrap">{{ getMotorOption(move.motor)?.label }}</td>
										<td class="text-no-wrap">{{ getCenterLabel(move) }}</td>
										<td class="px-0">
											<v-text-field v-model.number="move.length" type="number" min="1" :max="getMaxLength(move)" :disabled="!move.enabled" density="compact" variant="plain" hide-details />
										</td>
										<td>
											<v-select v-model="move.accelerometer" :items="accelerometers" :disabled="!move.enabled" density="compact" variant="plain" hide-details />
										</td>
									</tr>
								</tbody>
							</v-table>

							<v-alert v-if="!isCoreKinematics" type="info" variant="tonal" density="compact" class="mt-3">
								{{ $t("plugins.accelerometer.nonLinearKinematicsHint") }}
							</v-alert>
						</div>
					</v-window-item>

					<!-- Feedrate configuration -->
					<v-window-item value="feedrates">
						<div class="d-flex flex-column">
							{{ $t("plugins.accelerometer.defineSpeeds") }}

							<v-combobox :model-value="speeds" :label="$t('plugins.accelerometer.speeds')" :hint="$t('plugins.accelerometer.speedsHint')" persistent-hint
										multiple chips closable-chips density="compact" variant="outlined" class="mt-4"
										@update:model-value="(v) => setSpeeds(v as Array<string | number>)">
								<template #chip="{ item, props: chipProps }">
									<v-chip v-bind="chipProps" size="small" :title="getSpeedTooltip(Number(item))">{{ item }} mm/s</v-chip>
								</template>
							</v-combobox>

							<v-table density="compact" class="mt-3">
								<thead>
									<tr>
										<th class="px-0">{{ $t("plugins.accelerometer.motor") }}</th>
										<th>{{ $t("plugins.accelerometer.direction") }}</th>
										<th class="px-0">{{ $t("plugins.accelerometer.maxSpeed") }}</th>
										<th>{{ $t("plugins.accelerometer.fullStepFrequency") }}</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="move in enabledMoves" :key="move.motor">
										<td class="px-0">{{ move.motor }}</td>
										<td>{{ getMotorOption(move.motor)?.label }}</td>
										<td class="px-0" :title="`${Math.floor(getMaxSpeed(move) * 60)} mm/min`">{{ Math.floor(getMaxSpeed(move)) }}</td>
										<td class="text-no-wrap">{{ getFullStepFrequencyLabel(move) }}</td>
									</tr>
								</tbody>
							</v-table>

							<v-alert v-if="enabledMoves.some(m => speeds.some((speed) => !hasConstantSpeedSegment(toMotorMove(m, speed))))" type="warning" variant="tonal" density="compact" class="mt-3">
								{{ $t("plugins.accelerometer.noConstantSpeed") }}
							</v-alert>
							<v-alert v-if="enabledMoves.some(m => speeds.some((speed) => getConstantSpeedWindow(toMotorMove(m, speed)).moveDuration > warnDuration))" type="warning" variant="tonal" density="compact" class="mt-3">
								{{ $t("plugins.accelerometer.longRecording", [warnDuration]) }}
							</v-alert>

							<span class="mt-3">{{ $t("plugins.accelerometer.motorNextStarts") }}</span>
						</div>
					</v-window-item>

					<!-- Data collection -->
					<v-window-item value="collection">
						<span v-if="!finished">{{ $t("plugins.accelerometer.standBy") }}</span>

						<v-table density="compact" class="mt-1">
							<thead>
								<tr>
									<th class="px-0" />
									<th>{{ $t("plugins.accelerometer.accelerometer") }}</th>
									<th class="px-0">{{ $t("plugins.accelerometer.motor") }}</th>
									<th>{{ $t("plugins.accelerometer.startPosition") }}</th>
									<th class="px-0">{{ $t("plugins.accelerometer.endPosition") }}</th>
									<th>{{ $t("plugins.accelerometer.speed") }}</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(move, index) in recordings" :key="index">
									<td class="px-0"><v-icon>{{ getMoveIcon(move) }}</v-icon></td>
									<td>{{ move.accelerometer }}</td>
									<td class="px-0">{{ move.motor }}</td>
									<td>{{ getAxisWords(move, move.start) }}</td>
									<td class="px-0">{{ getAxisWords(move, move.end) }}</td>
									<td :title="`${move.feedrate} mm/min`">{{ formatSpeed(move.feedrate) }}</td>
								</tr>
							</tbody>
						</v-table>
						<v-divider />

						<v-alert v-if="cancelled" type="error" variant="tonal" density="compact" class="mt-3">
							{{ $t("plugins.accelerometer.cancelled") }}
						</v-alert>
						<v-alert v-if="finished && !cancelled" type="success" variant="tonal" density="compact" class="mt-3">
							{{ $t("plugins.accelerometer.motorCompleted", [run]) }}
						</v-alert>
					</v-window-item>
				</v-window>
			</v-card-text>

			<v-card-actions>
				<v-btn v-if="!cancelled && !finished" variant="text" @click="cancel">
					{{ $t("generic.cancel") }}
				</v-btn>
				<v-spacer />
				<v-btn v-if="currentPage === 'config' || currentPage === 'feedrates'" variant="text" @click="currentPage = (currentPage === 'config') ? 'start' : 'config'">
					{{ $t("plugins.accelerometer.back") }}
				</v-btn>
				<v-btn v-if="currentPage !== 'collection'" variant="text" :disabled="!canGoNext" @click="goNext">
					{{ $t("plugins.accelerometer.next") }}
				</v-btn>
				<v-btn v-if="cancelled || finished" variant="text" @click="dialogShown = false">
					{{ $t("plugins.accelerometer.finish") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { OperationCancelledError } from "@duet3d/connectors";
import { getFullStepFrequency } from "@duet3d/motionanalysis";
import { type Axis, CoreKinematics, MachineStatus } from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";

import { getAxisWords, getConstantSpeedWindow, getMotorFeedrate, getMotorProfileFilename, type MotorMove } from "./motorProfiles";
import { useAccelerometer } from "./useAccelerometer";

const MoveState = {
	idle: "idle",
	recording: "recording",
	finished: "finished",
	cancelled: "cancelled",
} as const;
type MoveStateKey = typeof MoveState[keyof typeof MoveState];

interface MoveItem extends MotorMove {
	state: MoveStateKey;
}

// Move as configured in the wizard: a motor-isolating line through the bed center
interface MoveConfig {
	enabled: boolean;
	accelerometer: string | null;
	motor: string;
	length: number;
}

// Cartesian direction that drives a single motor at a constant rate
interface MotorOption {
	motor: string;
	label: string;
	axes: Array<Axis>;
	direction: Array<number>;
	stepFactor: number;
}

// Full-step frequencies the default speeds aim for (in Hz)
const defaultFullStepFrequencies = [25, 50, 100, 200];

// Longest recording the default lengths aim for and beyond which a warning is shown (in s)
const defaultMaxDuration = 30, warnDuration = 50;

const props = defineProps<{
	lastRun: number;
}>();

const dialogShown = defineModel<boolean>("shown", { required: true });

const emit = defineEmits<{
	finished: [];
}>();

const machineStore = useMachineStore();
const { accelerometers, doCode, waitForAccelerometerRun } = useAccelerometer();

// #region OM-derived computeds
const move = computed(() => machineStore.model.move);
const machineState = computed(() => machineStore.model.state);
const allAxesHomed = computed(() => !move.value.axes.some((axis) => axis.visible && !axis.homed));
const travelAcceleration = computed(() => move.value.motionSystems[0]?.travelAcceleration ?? move.value.travelAcceleration);
const isCoreKinematics = computed(() => move.value.kinematics instanceof CoreKinematics);

// On core kinematics the column of the forward matrix belonging to a motor is the Cartesian direction that drives only this motor,
// because inverseMatrix * forwardMatrix is the identity. Other kinematics only run all motors at a constant rate on Z moves
const motorOptions = computed<Array<MotorOption>>(() => {
	const axes = move.value.axes, options: Array<MotorOption> = [];
	if (isCoreKinematics.value) {
		const kinematics = move.value.kinematics as CoreKinematics, identity = axes.map((_, row) => axes.map((_, col) => (row === col) ? 1 : 0));
		const forwardMatrix = kinematics.forwardMatrix.length > 0 ? kinematics.forwardMatrix : identity, inverseMatrix = kinematics.inverseMatrix.length > 0 ? kinematics.inverseMatrix : identity;
		for (let motorIndex = 0; motorIndex < axes.length && motorIndex < forwardMatrix.length; motorIndex++) {
			const column = axes.map((_, axisIndex) => forwardMatrix[axisIndex]?.[motorIndex] ?? 0);
			const involved = axes.filter((axis, axisIndex) => column[axisIndex] !== 0);
			if (involved.length === 0 || involved.some((axis) => !axis.visible)) {
				continue;
			}
			const length = Math.sqrt(column.reduce((sum, value) => sum + value * value, 0));
			const direction = involved.map((axis) => column[axes.indexOf(axis)] / length);
			if (direction[0] < 0) {
				direction.forEach((_, index) => { direction[index] = -direction[index]; });
			}
			const inverseRow = inverseMatrix[motorIndex] ?? [];
			options.push({
				motor: axes[motorIndex].letter,
				label: involved.map((axis, index) => `${(index > 0) ? ((direction[index] < 0) ? "-" : "+") : ""}${axis.letter}`).join(""),
				axes: involved,
				direction,
				stepFactor: Math.abs(involved.reduce((sum, axis, index) => sum + (inverseRow[axes.indexOf(axis)] ?? 0) * direction[index], 0))
			});
		}
	} else {
		const zAxis = axes.find((axis) => axis.letter === "Z" && axis.visible);
		if (zAxis) {
			options.push({ motor: "Z", label: "Z", axes: [zAxis], direction: [1], stepFactor: 1 });
		}
	}
	return options;
});
const motorLetters = computed(() => motorOptions.value.map((option) => option.motor));

function getMotorOption(motor: string): MotorOption | undefined {
	return motorOptions.value.find((option) => option.motor === motor);
}
// #endregion

// #region Wizard state
const currentPage = ref<"start" | "config" | "feedrates" | "collection">("start");
const moves = ref<Array<MoveConfig>>([]);
const enabledMoves = computed(() => moves.value.filter((m) => m.enabled));
const speeds = ref<Array<number>>([]);
const recordings = ref<Array<MoveItem>>([]);
const run = ref(0);
const finished = ref(false);
const cancelled = ref(false);

const canGoNext = computed(() => {
	if (currentPage.value === "start") {
		return accelerometers.value.length > 0 && allAxesHomed.value && motorOptions.value.length > 0;
	}
	if (currentPage.value === "config") {
		return enabledMoves.value.length > 0 && enabledMoves.value.every((m) => !!m.accelerometer && !!getMotorOption(m.motor) && m.length > 0 && m.length <= getMaxLength(m));
	}
	if (currentPage.value === "feedrates") {
		return speeds.value.length > 0 && enabledMoves.value.every((m) => speeds.value.every((speed) => speed > 0 && speed <= getMaxSpeed(m)));
	}
	return false;
});
// #endregion

// #region Move building helpers
function getCenter(option: MotorOption): Array<number> {
	return option.axes.map((axis) => (axis.min + axis.max) / 2);
}

// Longest line through the center that keeps every involved axis within its limits
function getMaxLength(m: MoveConfig): number {
	const option = getMotorOption(m.motor);
	return option ? Math.floor(Math.min(...option.axes.map((axis, index) => (axis.max - axis.min) / Math.abs(option.direction[index])))) : 0;
}

// Speed along the path (in mm/s) at which the fastest involved axis reaches its limit
function getMaxSpeed(m: MoveConfig): number {
	const option = getMotorOption(m.motor);
	return option ? Math.min(...option.axes.map((axis, index) => axis.speed / 60 / Math.abs(option.direction[index]))) : 0;
}

function toMotorMove(m: MoveConfig, speed: number): MotorMove {
	const option = getMotorOption(m.motor)!, center = getCenter(option), motorAxis = move.value.axes.find((axis) => axis.letter === m.motor)!;
	return {
		accelerometer: m.accelerometer,
		motor: m.motor,
		axes: option.axes.map((axis) => axis.letter).join(""),
		start: center.map((value, index) => Math.round((value - option.direction[index] * m.length / 2) * 100) / 100),
		end: center.map((value, index) => Math.round((value + option.direction[index] * m.length / 2) * 100) / 100),
		distance: m.length,
		feedrate: Math.round(speed * 60),
		acceleration: Math.floor(Math.min(travelAcceleration.value, ...option.axes.map((axis, index) => axis.acceleration / Math.abs(option.direction[index])))),
		fullStepsPerMm: Math.round(motorAxis.stepsPerMm / motorAxis.microstepping.value * 1000) / 1000,
		stepFactor: option.stepFactor
	};
}

// Sweep the default full-step frequencies of the first motor as far as every enabled move's speed limit and constant-speed requirement allow
function makeSpeeds() {
	if (enabledMoves.value.length === 0) {
		speeds.value = [];
		return;
	}
	const first = toMotorMove(enabledMoves.value[0], 0), maxSpeed = Math.min(...enabledMoves.value.map(getMaxSpeed));
	const candidates = defaultFullStepFrequencies.map((frequency) => Math.min(maxSpeed, Math.round(frequency / first.fullStepsPerMm / first.stepFactor * 10) / 10)).filter((speed) => enabledMoves.value.every((m) => hasConstantSpeedSegment(toMotorMove(m, speed))));
	speeds.value = Array.from(new Set(candidates));
	if (speeds.value.length === 0) {
		speeds.value = [Math.floor(Math.min(maxSpeed, 20))];
	}
}

// One move per motor, the X and Y drivers enabled by default where available, else whatever the kinematics offer (i.e. Z)
function makeMoves() {
	if (currentPage.value !== "collection") {
		const hasXY = motorOptions.value.some((option) => option.motor === "X" || option.motor === "Y");
		moves.value = motorOptions.value.map((option) => ({
			enabled: !hasXY || option.motor === "X" || option.motor === "Y",
			accelerometer: accelerometers.value.length > 0 ? accelerometers.value[0] : null,
			motor: option.motor,
			length: Math.round(getMaxLength({ enabled: true, accelerometer: null, motor: option.motor, length: 0 }) / 2)
		}));
		makeSpeeds();

		// Keep the slowest default recording short, expansion boards reset when a collection starves their main task for a minute
		if (speeds.value.length > 0) {
			const maxLength = Math.floor(Math.min(...speeds.value) * defaultMaxDuration);
			moves.value.forEach((m) => { m.length = Math.min(m.length, maxLength); });
		}
	}
}

function setSpeeds(values: Array<string | number>) {
	speeds.value = Array.from(new Set(values.map((value) => parseFloat(value as string)).filter((value) => !isNaN(value) && value > 0))).sort((a, b) => a - b);
}

function formatSpeed(feedrate: number): string {
	return `${(feedrate / 60).toFixed(1)} mm/s`;
}

function getSpeedTooltip(speed: number): string {
	const frequencies = enabledMoves.value.filter((m) => getMotorOption(m.motor)).map((m) => {
		const motorMove = toMotorMove(m, speed);
		return `${m.motor}: ${getFullStepFrequency(getMotorFeedrate(motorMove), motorMove.fullStepsPerMm, 1).toFixed(1)} Hz`;
	});
	return [`${Math.round(speed * 60)} mm/min`, ...frequencies].join(", ");
}

function hasConstantSpeedSegment(m: MotorMove): boolean {
	return getConstantSpeedWindow(m).duration > 0;
}

function getCenterLabel(m: MoveConfig): string {
	const option = getMotorOption(m.motor);
	return option ? getAxisWords(toMotorMove(m, 0), getCenter(option)) : "";
}

function getFullStepFrequencyLabel(m: MoveConfig): string {
	if (speeds.value.length === 0 || !getMotorOption(m.motor)) {
		return "";
	}
	const frequencies = speeds.value.map((speed) => {
		const motorMove = toMotorMove(m, speed);
		return getFullStepFrequency(getMotorFeedrate(motorMove), motorMove.fullStepsPerMm, 1);
	});
	return (frequencies.length === 1) ? `${frequencies[0].toFixed(1)} Hz` : `${Math.min(...frequencies).toFixed(1)} - ${Math.max(...frequencies).toFixed(1)} Hz`;
}
// #endregion

// #region Recording loop
async function recordMove(moveIndex: number) {
	const m = recordings.value[moveIndex];
	m.state = MoveState.recording;
	try {
		if (cancelled.value) {
			throw new OperationCancelledError();
		}
		await doCode(`G1 ${getAxisWords(m, m.start)} F${Math.max(...move.value.axes.filter((axis) => m.axes.includes(axis.letter)).map((axis) => axis.speed))}`);
		await doCode("G4 S1");
		if (cancelled.value) {
			throw new OperationCancelledError();
		}

		// Sample count is generous because the actual sampling rate is only known once the file is written
		const numSamples = Math.ceil(2000 * (getConstantSpeedWindow(m).moveDuration + 0.5));
		await doCode(`M400 M956 P${m.accelerometer} S${numSamples} A1 F"${getMotorProfileFilename(run.value, m)}" G1 ${getAxisWords(m, m.end)} F${m.feedrate}`);
		await waitForAccelerometerRun(m.accelerometer!, cancelled);
		m.state = MoveState.finished;

		if (moveIndex + 1 < recordings.value.length) {
			await recordMove(moveIndex + 1);
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

function goNext() {
	if (currentPage.value === "start") {
		currentPage.value = "config";
	} else if (currentPage.value === "config") {
		currentPage.value = "feedrates";
	} else if (currentPage.value === "feedrates") {
		recordings.value = enabledMoves.value.flatMap((m) => speeds.value.map((speed) => ({ ...toMotorMove(m, speed), state: MoveState.idle })));
		currentPage.value = "collection";
		cancelled.value = false;
		recordMove(0);
	}
}

onMounted(() => {
	run.value = props.lastRun + 1;
	makeMoves();
});

watch(accelerometers, () => makeMoves());
watch(() => motorLetters.value.join(), () => makeMoves());
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
