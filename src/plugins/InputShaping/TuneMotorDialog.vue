<template>
	<v-dialog v-model="dialogShown" max-width="720px" no-click-animation persistent>
		<v-card>
			<v-card-title>
				<v-icon class="mr-2">mdi-tune</v-icon>
				{{ $t("plugins.accelerometer.tuneTitle") }}
			</v-card-title>

			<v-card-text class="pb-0">
				<v-window v-model="currentPage" :touch="false">
					<!-- Configuration -->
					<v-window-item value="config">
						<div class="mb-5">{{ $t("plugins.accelerometer.tuneIntro") }}</div>

						<v-alert v-if="accelerometers.length === 0" type="error" variant="tonal" class="my-3" density="compact">
							{{ $t("plugins.accelerometer.noAccelerometer") }}
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

						<v-row class="mt-1">
							<v-col cols="6">
								<v-select v-model="motor" :items="motorItems" :label="$t('plugins.accelerometer.motor')" density="compact" variant="outlined" hide-details />
							</v-col>
							<v-col cols="6">
								<v-select v-model="accelerometer" :items="accelerometers" :label="$t('plugins.accelerometer.accelerometer')" density="compact" variant="outlined" hide-details />
							</v-col>
							<v-col cols="6">
								<v-text-field v-model.number="speed" type="number" min="1" :max="maxSpeed" :label="$t('plugins.accelerometer.speedLabel')" :hint="speedHint" persistent-hint density="compact" variant="outlined" />
							</v-col>
							<v-col cols="6">
								<v-text-field v-model.number="length" type="number" min="1" :max="maxLength" :label="$t('plugins.accelerometer.length')" density="compact" variant="outlined" hide-details />
							</v-col>
							<v-col cols="12" class="d-flex pt-0 mt-n2">
								<v-tooltip :disabled="phaseStepping" location="bottom">
									<template #activator="{ props }">
										<div v-bind="props" class="mr-4">
											<v-checkbox v-model="tuneHarmonics" :value="2" :disabled="!phaseStepping" :label="$t('plugins.accelerometer.tuneHarmonic2')" density="compact" color="primary" hide-details />
										</div>
									</template>
									{{ $t("plugins.accelerometer.tuneHarmonic2Tooltip") }}
								</v-tooltip>
								<v-checkbox v-model="tuneHarmonics" :value="4" :label="$t('plugins.accelerometer.tuneHarmonic4')" density="compact" color="primary" hide-details />
							</v-col>
						</v-row>

						<v-alert v-if="!phaseStepping" type="info" variant="tonal" density="compact" class="mt-1">
							{{ $t("plugins.accelerometer.tuneStepDirHint") }}
						</v-alert>
						<v-alert type="info" variant="tonal" density="compact" class="mt-1">
							{{ $t("plugins.accelerometer.tuneHint", [numMoves, Math.max(1, Math.round(numMoves * (currentMove ? 2 * getConstantSpeedWindow(currentMove).moveDuration + 2 : 6) / 60))]) }}
						</v-alert>
					</v-window-item>

					<!-- Tuning -->
					<v-window-item value="tuning">
						<v-progress-linear :active="running" :model-value="measurements.length / numMoves * 100" class="mb-2" />
						<div v-if="running">{{ statusText }}</div>

						<v-table density="compact" class="mt-1">
							<thead>
								<tr>
									<th />
									<th>{{ $t("plugins.accelerometer.harmonic") }}</th>
									<th>{{ $t("plugins.accelerometer.magnitude") }}</th>
									<th>{{ $t("plugins.accelerometer.phase") }}</th>
									<th>{{ $t("plugins.accelerometer.amplitude") }}</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(item, index) in baselineMeasurements" :key="item.harmonic">
									<td v-if="index === 0" :rowspan="baselineMeasurements.length">{{ $t("plugins.accelerometer.originalMeasurement") }}</td>
									<td>{{ item.harmonic }}</td>
									<td>{{ item.magnitude.toFixed(2) }}</td>
									<td>{{ item.phase.toFixed(1) }}</td>
									<td>{{ formatAmplitude(item.amplitude, item.harmonic) }}</td>
								</tr>
								<tr v-if="lastMeasurement && running">
									<td>{{ $t("plugins.accelerometer.lastMeasurement", [measurements.length, numMoves]) }}</td>
									<td>{{ lastMeasurement.harmonic }}</td>
									<td>{{ lastMeasurement.magnitude.toFixed(2) }}</td>
									<td>{{ lastMeasurement.phase.toFixed(1) }}</td>
									<td>{{ formatAmplitude(lastMeasurement.amplitude, lastMeasurement.harmonic) }}</td>
								</tr>
								<tr v-for="(item, index) in bestMeasurements" :key="item.harmonic" class="font-weight-bold">
									<td v-if="index === 0" :rowspan="bestMeasurements.length">{{ $t("plugins.accelerometer.bestMeasurement") }}</td>
									<td>{{ item.harmonic }}</td>
									<td>{{ item.magnitude.toFixed(2) }}</td>
									<td>{{ item.phase.toFixed(1) }}</td>
									<td>{{ formatAmplitude(item.amplitude, item.harmonic) }}</td>
								</tr>
							</tbody>
						</v-table>

						<v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3">
							{{ error }}
						</v-alert>
						<v-alert v-if="cancelled" type="error" variant="tonal" density="compact" class="mt-3">
							{{ $t("plugins.accelerometer.cancelled") }}
						</v-alert>
						<template v-if="finished && !cancelled && !error">
							<v-alert v-for="result in results" :key="result.harmonic" :type="(result.best.amplitude < result.baseline) ? 'success' : 'warning'" variant="tonal" density="compact" class="mt-3">
								{{ (result.best.amplitude < result.baseline) ? $t("plugins.accelerometer.tuneImproved", [result.harmonic, formatAmplitude(result.baseline, result.harmonic), formatAmplitude(result.best.amplitude, result.harmonic), Math.round((1 - result.best.amplitude / result.baseline) * 100)]) : $t("plugins.accelerometer.tuneNoImprovement", [result.harmonic]) }}
							</v-alert>
							<v-alert v-if="resultCodes.length > 0" type="info" variant="tonal" density="compact" class="mt-3">
								{{ $t("plugins.accelerometer.tuneResultCodes") }}
								<pre class="mt-1">{{ resultCodes.join("\n") }}</pre>
							</v-alert>
						</template>
					</v-window-item>
				</v-window>
			</v-card-text>

			<v-card-actions>
				<v-btn v-if="!finished" variant="text" @click="cancel">
					{{ $t("generic.cancel") }}
				</v-btn>
				<v-spacer />
				<v-btn v-if="currentPage === 'config'" variant="text" :disabled="!canStart" @click="start">
					{{ $t("plugins.accelerometer.tuneStart") }}
				</v-btn>
				<template v-if="finished">
					<v-btn v-if="!cancelled && !error && resultCodes.length > 0" variant="text" @click="close(false)">
						{{ $t("plugins.accelerometer.tuneDiscard") }}
					</v-btn>
					<v-btn variant="text" @click="close(true)">
						{{ (!cancelled && !error && resultCodes.length > 0) ? $t("plugins.accelerometer.tuneKeep") : $t("plugins.accelerometer.finish") }}
					</v-btn>
				</template>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { OperationCancelledError } from "@duet3d/connectors";
import { analyzeMotorHarmonics, combineAxes, getDisplacementAmplitude, getFullStepFrequency } from "@duet3d/motionanalysis";
import { InputShapingType } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { getErrorMessage } from "@/utils/errors";
import Path from "@/utils/path";

import { getConstantSpeedWindow, getMotorFeedrate, type MotorMove } from "./motorProfiles";
import { getMovesPerHarmonic, type HarmonicTuningResult, parsePhaseCorrections, type PhaseCorrection, tuneHarmonic, tuningFilePrefix, type TuningMeasurement } from "./motorTuning";
import { useAccelerometer } from "./useAccelerometer";
import { useMotorAnalysisSettings } from "./useMotorAnalysisSettings";
import { useMotorMoves } from "./useMotorMoves";

// Full-step frequency the default speed aims for (in Hz), the second harmonic of the electrical cycle then lands at half of it. High enough for a strong signal, low enough to stay well below the Nyquist frequency of common accelerometers
const defaultFullStepFrequency = 400;

const dialogShown = defineModel<boolean>("shown", { required: true });

const machineStore = useMachineStore();
const { accelerometers, doCode, loadAccelerometerFile, getSamplingRate } = useAccelerometer();
const motorMoves = useMotorMoves();
const { move, motorOptions, getMotorOption, buildMove } = motorMoves;
const { showDisplacement } = useMotorAnalysisSettings();

// Standard gravity in mm/s^2 for converting g into displacement
const gravity = 9806.65;

// #region Configuration
const currentPage = ref<"config" | "tuning">("config");
const motor = ref<string | null>(null);
const accelerometer = ref<string | null>(null);
const speed = ref(0);
const length = ref(0);
const tuneHarmonics = ref<Array<number>>([2, 4]);

const allAxesHomed = computed(() => !move.value.axes.some((axis) => axis.visible && !axis.homed));
const motorItems = computed(() => motorOptions.value.map((option) => ({ title: `${i18n.global.t("plugins.accelerometer.motor")} ${option.motor} (${option.label})`, value: option.motor })));
const option = computed(() => motor.value ? getMotorOption(motor.value) ?? null : null);
const maxSpeed = computed(() => option.value ? Math.floor(motorMoves.getMaxSpeed(option.value)) : 0);
const maxLength = computed(() => option.value ? motorMoves.getMaxLength(option.value) : 0);
const numMoves = computed(() => tuneHarmonics.value.length * getMovesPerHarmonic(!phaseStepping.value));

// The driver that gets the correction commands is the first driver of the axis with the motor's letter.
// In phase stepping mode the corrections go into M970.3, else into the driver's sine table via M569.2 where
// only harmonics that are multiples of 4 with a phase of 0 or 180 degrees can be represented
const driverId = computed(() => move.value.axes.find((axis) => axis.letter === motor.value)?.drivers[0]?.toString() ?? null);
const phaseStepping = computed(() => move.value.axes.find((axis) => axis.letter === motor.value)?.phaseStep ?? false);
const correctionCommand = computed(() => phaseStepping.value ? "M970.3" : "M569.2");

const currentMove = computed<MotorMove | null>(() => option.value ? buildMove(option.value, length.value, speed.value, accelerometer.value) : null);
const speedHint = computed(() => currentMove.value ? `${getFullStepFrequency(getMotorFeedrate(currentMove.value), currentMove.value.fullStepsPerMm, 1).toFixed(1)} Hz` : "");

const canStart = computed(() => !!option.value && !!accelerometer.value && !!driverId.value && allAxesHomed.value && tuneHarmonics.value.length > 0 && speed.value > 0 && speed.value <= maxSpeed.value && length.value > 0 && length.value <= maxLength.value && !!currentMove.value && getConstantSpeedWindow(currentMove.value).duration > 0);

function applyDefaults() {
	if (!motor.value || !getMotorOption(motor.value)) {
		motor.value = motorOptions.value[0]?.motor ?? null;
	}
	if (!accelerometer.value || !accelerometers.value.includes(accelerometer.value)) {
		accelerometer.value = accelerometers.value[0] ?? null;
	}
	tuneHarmonics.value = phaseStepping.value ? [2, 4] : [4];
	if (option.value) {
		const probe = buildMove(option.value, 1, 1, null);
		speed.value = Math.min(maxSpeed.value, Math.round(defaultFullStepFrequency / probe.fullStepsPerMm / probe.stepFactor * 10) / 10);
		length.value = Math.min(Math.round(maxLength.value / 2), Math.floor(speed.value * 5));
	}
}
// #endregion

// #region Tuning run
const running = ref(false);
const finished = ref(false);
const cancelled = ref(false);
const error = ref<string | null>(null);
const statusText = ref("");
const measurements = ref<Array<TuningMeasurement>>([]);
const results = ref<Array<HarmonicTuningResult>>([]);
const previousCorrections = ref<Array<PhaseCorrection>>([]);
const previousShaping = ref<{ type: string; frequency: number; damping: number } | null>(null);
let fileCounter = 0, samplingRate = 2000;

const resultCodes = computed(() => results.value.filter((result) => result.best.amplitude < result.baseline).map((result) => `${correctionCommand.value} P${driverId.value} S${result.harmonic} J${result.best.magnitude.toFixed(2)} O${result.best.phase.toFixed(1)}`));

const lastMeasurement = computed<TuningMeasurement | null>(() => measurements.value.length > 0 ? measurements.value[measurements.value.length - 1] : null);

// Amplitude in the unit selected on the Motor Analysis tab, displacement is derived at the harmonic's frequency
function formatAmplitude(amplitude: number, harmonic: number): string {
	if (showDisplacement.value && currentMove.value) {
		const frequency = getFullStepFrequency(getMotorFeedrate(currentMove.value), currentMove.value.fullStepsPerMm, 1) * harmonic / 4;
		return `${(getDisplacementAmplitude(amplitude * gravity, frequency) * 1000).toFixed(2)} um`;
	}
	return `${amplitude.toFixed(4)} g`;
}

// The first measurement of each harmonic is taken without correction
const baselineMeasurements = computed<Array<TuningMeasurement>>(() => tuneHarmonics.value
	.map((harmonic) => measurements.value.find((m) => m.harmonic === harmonic) ?? null)
	.filter((m): m is TuningMeasurement => m !== null));

// Lowest amplitude seen so far per harmonic, replaced by the finalist result once a harmonic is done
const bestMeasurements = computed<Array<TuningMeasurement>>(() => tuneHarmonics.value
	.map((harmonic) => results.value.find((result) => result.harmonic === harmonic)?.best ?? measurements.value.filter((m) => m.harmonic === harmonic).reduce<TuningMeasurement | null>((best, m) => (!best || m.amplitude < best.amplitude) ? m : best, null))
	.filter((m): m is TuningMeasurement => m !== null));

async function setCorrection(harmonic: number, magnitude: number, phase: number) {
	await doCode(`${correctionCommand.value} P${driverId.value} S${harmonic} J${magnitude.toFixed(3)} O${phase.toFixed(1)}`);
}

// Apply a candidate, record one move (alternating the direction) and return the vibration amplitude at the harmonic; the recording is deleted again
async function measure(harmonic: number, magnitude: number, phase: number): Promise<TuningMeasurement> {
	if (cancelled.value) {
		throw new OperationCancelledError();
	}
	await setCorrection(harmonic, magnitude, phase);
	statusText.value = i18n.global.t("plugins.accelerometer.tuneStatus", [harmonic, magnitude.toFixed(2), phase.toFixed(1)]);

	// The move is recorded as a round trip so that both directions contribute equally to every measurement; the two constant-speed windows are analyzed separately and averaged
	const filename = `${tuningFilePrefix}${++fileCounter}.csv`;
	await motorMoves.recordMove(currentMove.value!, filename, speed.value, samplingRate, cancelled, true);
	const dataset = await loadAccelerometerFile(filename, 8);
	await machineStore.delete(Path.combine(Path.accelerometer, filename));

	const window = getConstantSpeedWindow(currentMove.value!), rate = dataset.samplingRate, numSamples = dataset.samples[0].length;
	const fullStepFrequency = getFullStepFrequency(getMotorFeedrate(currentMove.value!), currentMove.value!.fullStepsPerMm, 1);
	const amplitudes = [0, window.moveDuration].map((offset) => {
		const start = Math.min(numSamples - 1, Math.round((offset + window.start + 0.1 * window.duration) * rate));
		const end = Math.min(numSamples, Math.round((offset + window.start + 0.9 * window.duration) * rate));
		const result = analyzeMotorHarmonics(dataset.samples.map((axisSamples) => axisSamples.slice(start, end)), rate, fullStepFrequency, 1);
		return combineAxes(result)[result.orders.indexOf(harmonic / 4)];
	});
	const measurement: TuningMeasurement = { harmonic, magnitude, phase, amplitude: (amplitudes[0] + amplitudes[1]) / 2, amplitudes: [amplitudes[0], amplitudes[1]] };
	measurements.value.push(measurement);
	return measurement;
}

async function start() {
	currentPage.value = "tuning";
	running.value = true;
	finished.value = false;
	cancelled.value = false;
	error.value = null;
	measurements.value = [];
	results.value = [];
	try {
		samplingRate = await getSamplingRate(accelerometer.value!);

		// Remember what to restore, then disable input shaping. The corrections are tuned in whatever step mode the motor uses
		const reply = await machineStore.sendCode(`${correctionCommand.value} P${driverId.value}`);
		previousCorrections.value = parsePhaseCorrections(typeof reply === "string" ? reply : "");
		const shaping = move.value.shaping;
		previousShaping.value = (shaping.type !== InputShapingType.none && shaping.type !== InputShapingType.custom) ? { type: shaping.type, frequency: shaping.frequency, damping: shaping.damping } : null;
		if (previousShaping.value) {
			await doCode('M593 P"none"');
		}

		for (const harmonic of tuneHarmonics.value) {
			const result = await tuneHarmonic(harmonic, (magnitude, phase) => measure(harmonic, magnitude, phase), !phaseStepping.value);
			results.value.push(result);
			await setCorrection(harmonic, (result.best.amplitude < result.baseline) ? result.best.magnitude : 0, result.best.phase);
		}
	} catch (e) {
		if (!(e instanceof OperationCancelledError)) {
			error.value = getErrorMessage(e);
		}
	} finally {
		running.value = false;
		finished.value = true;
		try {
			if (previousShaping.value) {
				await doCode(`M593 P"${previousShaping.value.type}" F${previousShaping.value.frequency} S${previousShaping.value.damping}`);
			}
		} catch (e) {
			console.warn(e);
		}
	}
}

// Restore the previous corrections unless the result is kept
async function close(keep: boolean) {
	dialogShown.value = false;
	try {
		if (!keep || cancelled.value || error.value) {
			for (const harmonic of tuneHarmonics.value) {
				const previous = previousCorrections.value.find((correction) => correction.harmonic === harmonic);
				await setCorrection(harmonic, previous?.magnitude ?? 0, previous?.phase ?? 0);
			}
		}
	} catch (e) {
		console.warn(e);
	}
}

function cancel() {
	if (currentPage.value === "tuning" && running.value) {
		cancelled.value = true;
	} else {
		dialogShown.value = false;
	}
}
// #endregion

watch(dialogShown, (to) => {
	if (to) {
		currentPage.value = "config";
		finished.value = false;
		cancelled.value = false;
		error.value = null;
		applyDefaults();
	}
});
watch(motor, () => applyDefaults());
watch(phaseStepping, (to) => {
	if (!to) {
		tuneHarmonics.value = tuneHarmonics.value.filter((harmonic) => harmonic % 4 === 0);
		if (tuneHarmonics.value.length === 0) {
			tuneHarmonics.value = [4];
		}
	}
});
</script>
