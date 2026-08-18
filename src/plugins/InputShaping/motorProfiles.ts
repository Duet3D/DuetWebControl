/**
 * Parameters of a constant-speed recording that the analysis needs to reproduce it
 */
export interface MotorRun {
	accelerometer: string | null;

	/**
	 * Letter of the driver whose motor is analyzed
	 */
	motor: string;

	/**
	 * Path length of the move (in mm)
	 */
	distance: number;

	/**
	 * Feedrate along the path (in mm/min)
	 */
	feedrate: number;

	/**
	 * Acceleration along the path (in mm/s^2)
	 */
	acceleration: number;

	/**
	 * Full steps per mm of motor travel, i.e. steps per mm divided by the microstepping
	 */
	fullStepsPerMm: number;

	/**
	 * Motor travel per mm of path (1 for a single-axis move, sqrt(2) for a CoreXY diagonal)
	 */
	stepFactor: number;
}

/**
 * Recording plus the coordinates needed to execute it.
 * On core kinematics a move may span several axes so that it drives a single motor only
 */
export interface MotorMove extends MotorRun {
	/**
	 * Axes involved in the move (e.g. "X" or "XY")
	 */
	axes: string;

	/**
	 * Start and end coordinates per involved axis
	 */
	start: Array<number>;
	end: Array<number>;
}

/**
 * Get the effective feedrate of the analyzed motor
 * @param run Recording
 * @returns Motor feedrate (in mm/min), to be used with getFullStepFrequency and a microstepping of 1
 */
export function getMotorFeedrate(run: MotorRun): number {
	return run.feedrate * run.stepFactor;
}

/**
 * Get the G-code axis words of a coordinate set
 * @param move Move
 * @param coordinates Coordinates per involved axis
 * @returns Axis words (e.g. "X10 Y20")
 */
export function getAxisWords(move: MotorMove, coordinates: Array<number>): string {
	return coordinates.map((coordinate, index) => `${move.axes[index]}${coordinate}`).join(" ");
}

/**
 * Constant-speed portion of a trapezoidal move
 */
export interface ConstantSpeedWindow {
	/**
	 * Time from the start of the move until the constant-speed segment starts (in s)
	 */
	start: number;

	/**
	 * Duration of the constant-speed segment (in s), zero if the move never reaches its feedrate
	 */
	duration: number;

	/**
	 * Total duration of the move (in s)
	 */
	moveDuration: number;
}

/**
 * Compute the constant-speed window of a trapezoidal move
 * @param run Recording
 * @returns Constant-speed window
 */
export function getConstantSpeedWindow(run: MotorRun): ConstantSpeedWindow {
	const speed = run.feedrate / 60;
	const rampTime = speed / run.acceleration, rampDistance = speed * rampTime / 2;
	if (2 * rampDistance >= run.distance) {
		// Triangular profile, the move never reaches its feedrate
		return { start: 0, duration: 0, moveDuration: 2 * Math.sqrt(run.distance / run.acceleration) };
	}
	const duration = (run.distance - 2 * rampDistance) / speed;
	return { start: rampTime, duration, moveDuration: 2 * rampTime + duration };
}

/**
 * Build the filename of a motor profile so that the analysis can be reproduced from the name alone.
 * RRF truncates M956 filenames to 49 characters, hence the terse encoding
 * @param runNumber Run number
 * @param run Recording
 * @returns Filename
 */
export function getMotorProfileFilename(runNumber: number, run: MotorRun): string {
	return `M${runNumber}-${run.motor}-F${run.feedrate}-A${run.acceleration}-P${run.fullStepsPerMm}-K${run.stepFactor.toFixed(3)}-L${run.distance}-${run.accelerometer}.csv`;
}

/**
 * Chart views of the motor analysis
 */
export type MotorView = "harmonics" | "spectrum" | "sweep" | "summary";

/**
 * Harmonic amplitudes across a speed sweep, i.e. profiles of the same run, move and accelerometer at different feedrates
 */
export interface MotorSweepResult {
	feedrates: Array<number>;
	fullStepFrequencies: Array<number>;
	orders: Array<number>;

	/**
	 * Amplitude per order (outer) and profile (inner), combined over all accelerometer axes
	 */
	amplitudes: Array<Array<number>>;
}

/**
 * Parsed motor profile file
 */
export interface MotorProfile extends MotorRun {
	run: number;
	filename: string;
}

/**
 * Parse the filename of a motor profile, see getMotorProfileFilename
 * @param filename Filename to parse
 * @returns Parsed profile or null if the filename is not a motor profile
 */
export function parseMotorProfileFilename(filename: string): MotorProfile | null {
	const matches = /^M(\d+)-([A-Z])-F(\d+\.?\d*)-A(\d+\.?\d*)-P(\d+\.?\d*)-K(\d+\.?\d*)-L(\d+\.?\d*)-([\d.]+)\.csv$/.exec(filename);
	if (!matches) {
		return null;
	}
	return {
		run: parseInt(matches[1]),
		filename,
		motor: matches[2],
		feedrate: parseFloat(matches[3]),
		acceleration: parseFloat(matches[4]),
		fullStepsPerMm: parseFloat(matches[5]),
		stepFactor: parseFloat(matches[6]),
		distance: parseFloat(matches[7]),
		accelerometer: matches[8],
	};
}
