import { OperationCancelledError } from "@duet3d/connectors";
import { type Axis, CoreKinematics } from "@duet3d/objectmodel";
import { computed, type Ref } from "vue";

import { useMachineStore } from "@/stores/machine";

import { getAxisWords, getConstantSpeedWindow, type MotorMove } from "./motorProfiles";
import { useAccelerometer } from "./useAccelerometer";

/**
 * Cartesian direction that drives a single motor at a constant rate
 */
export interface MotorOption {
	motor: string;
	label: string;
	axes: Array<Axis>;
	direction: Array<number>;
	stepFactor: number;
}

// A waveform correction is stored in the sine table of a TMC5160-class driver, which M569.2 only reaches on the main board
const waveformTuningBoards = ["MB6HC"];

/**
 * Motor-isolating moves through the center of the axes and their recording, shared by the motor profile and tuning dialogs
 */
export function useMotorMoves() {
	const machineStore = useMachineStore();
	const { doCode, waitForAccelerometerRun } = useAccelerometer();

	const move = computed(() => machineStore.model.move);
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

	// Motors whose driver can carry a waveform correction, i.e. a local driver of a board with programmable sine tables
	const tunableMotors = computed<Array<MotorOption>>(() => waveformTuningBoards.includes(machineStore.model.boards[0]?.shortName ?? "")
		? motorOptions.value.filter((option) => (move.value.axes.find((axis) => axis.letter === option.motor)?.drivers[0]?.board ?? 0) === 0)
		: []);

	function getMotorOption(motor: string): MotorOption | undefined {
		return motorOptions.value.find((option) => option.motor === motor);
	}

	function getCenter(option: MotorOption): Array<number> {
		return option.axes.map((axis) => (axis.min + axis.max) / 2);
	}

	// Longest line through the center that keeps every involved axis within its limits
	function getMaxLength(option: MotorOption): number {
		return Math.floor(Math.min(...option.axes.map((axis, index) => (axis.max - axis.min) / Math.abs(option.direction[index]))));
	}

	// Speed along the path (in mm/s) at which the fastest involved axis reaches its limit
	function getMaxSpeed(option: MotorOption): number {
		return Math.min(...option.axes.map((axis, index) => axis.speed / 60 / Math.abs(option.direction[index])));
	}

	function buildMove(option: MotorOption, length: number, speed: number, accelerometer: string | null): MotorMove {
		const center = getCenter(option), motorAxis = move.value.axes.find((axis) => axis.letter === option.motor)!;
		return {
			accelerometer,
			motor: option.motor,
			axes: option.axes.map((axis) => axis.letter).join(""),
			start: center.map((value, index) => Math.round((value - option.direction[index] * length / 2) * 100) / 100),
			end: center.map((value, index) => Math.round((value + option.direction[index] * length / 2) * 100) / 100),
			distance: length,
			feedrate: Math.round(speed * 60),
			acceleration: Math.floor(Math.min(travelAcceleration.value, ...option.axes.map((axis, index) => axis.acceleration / Math.abs(option.direction[index])))),
			fullStepsPerMm: Math.round(motorAxis.stepsPerMm / motorAxis.microstepping.value * 1000) / 1000,
			stepFactor: option.stepFactor
		};
	}

	// Move to the start at the given travel speed (in mm/s), then record the move into the given accelerometer file and wait for the file to be written.
	// The sampling rate sizes the collection, see useAccelerometer().getSamplingRate
	async function recordMove(m: MotorMove, filename: string, travelSpeed: number, samplingRate: number, cancelled: Ref<boolean>, roundTrip: boolean = false) {
		if (cancelled.value) {
			throw new OperationCancelledError();
		}
		await doCode(`G1 ${getAxisWords(m, m.start)} F${Math.round(travelSpeed * 60)}`);
		if (machineStore.isStandaloneMode) {
			// In standalone mode the code reply does not wait for the move, so give it time to finish before the M400 M956 line is sent
			await doCode("G4 S1");
		}
		if (cancelled.value) {
			throw new OperationCancelledError();
		}

		// Only the constant-speed part is analyzed, so stop collecting shortly after it (after the one of the way back on a round trip);
		// the margin covers the delay between M956 and the start of the move, the 5% headroom this run collecting faster than the last one it was measured from
		const window = getConstantSpeedWindow(m);
		const numSamples = Math.ceil(1.05 * samplingRate * ((roundTrip ? window.moveDuration : 0) + window.start + 0.9 * window.duration + 0.15));
		const moves = `G1 ${getAxisWords(m, m.end)} F${m.feedrate}` + (roundTrip ? ` G1 ${getAxisWords(m, m.start)} F${m.feedrate}` : "");
		await doCode(`M400 M956 P${m.accelerometer} S${numSamples} A1 F"${filename}" ${moves}`);
		await waitForAccelerometerRun(m.accelerometer!, cancelled);
	}

	return { move, isCoreKinematics, motorOptions, tunableMotors, getMotorOption, getCenter, getMaxLength, getMaxSpeed, buildMove, recordMove };
}
