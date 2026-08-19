/**
 * Prefix of the temporary recordings made while tuning, they are deleted right after being analyzed and never listed
 */
export const tuningFilePrefix = "tune-";

/**
 * Check if a filename (with or without path) belongs to a temporary tuning recording
 */
export function isTuningFile(filename: string): boolean {
	return filename.substring(filename.lastIndexOf("/") + 1).startsWith(tuningFilePrefix);
}

/**
 * Phase correction of one harmonic, see M970.3
 */
export interface PhaseCorrection {
	harmonic: number;
	magnitude: number;
	phase: number;
}

/**
 * One measurement of the tuning run. The vibration amplitudes of both move directions are kept separately because
 * their optima differ (a rotor-fixed error component shifts by the load angle, which flips sign with the direction)
 */
export interface TuningMeasurement {
	harmonic: number;
	magnitude: number;
	phase: number;

	/**
	 * Mean amplitude of both directions
	 */
	amplitude: number;

	/**
	 * Amplitude per move direction
	 */
	amplitudes: [number, number];
}

/**
 * Result of tuning one harmonic
 */
export interface HarmonicTuningResult {
	harmonic: number;
	baseline: number;
	best: TuningMeasurement;
}

/**
 * Parse the reply of M970.3 (e.g. "Driver 0 phase correction: S2 J1.500 O200.0, S4 J0.300 O0.0")
 * @param reply Reply text
 * @returns Configured corrections
 */
export function parsePhaseCorrections(reply: string): Array<PhaseCorrection> {
	const result: Array<PhaseCorrection> = [];
	for (const match of reply.matchAll(/S(\d+) J([\d.]+) O([\d.]+)/g)) {
		result.push({ harmonic: parseInt(match[1]), magnitude: parseFloat(match[2]), phase: parseFloat(match[3]) });
	}
	return result;
}

/**
 * Tuning schedule per harmonic: probe measurements at the probe magnitude, a model fit, refinement probes around the
 * first optimum and a verification measurement at the refit optimum
 */
export interface TuningSchedule {
	probeMagnitude: number;
	maxMagnitude: number;
	minRefineRadius: number;
}

export const defaultTuningSchedule: TuningSchedule = {
	probeMagnitude: 1,
	maxMagnitude: 4,
	minRefineRadius: 0.2
};

/**
 * Number of moves tuneHarmonic records per harmonic (baseline + probes + refinement probes + verification).
 * With the phase constrained to 0/180 the correction is one-dimensional and needs fewer probes
 * @param constrainPhase Whether the phase is constrained to 0 or 180 degrees (sine table tuning)
 */
export function getMovesPerHarmonic(constrainPhase: boolean = false): number {
	return constrainPhase ? 6 : 10;
}

/**
 * Least-squares fit of one direction's response to the vector-sum model |E + s J e^(iO)|^2 with error vector E and
 * complex correction gain s, i.e. A^2 = u + v J^2 + 2 J (a cos O + b sin O) - linear in (u, v, a, b)
 */
interface DirectionFit {
	u: number;
	v: number;
	a: number;
	b: number;
}

function solve(matrix: Array<Array<number>>, rhs: Array<number>): Array<number> {
	const n = rhs.length, m = matrix.map((row, i) => [...row, rhs[i]]);
	for (let col = 0; col < n; col++) {
		let pivot = col;
		for (let row = col + 1; row < n; row++) {
			if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) {
				pivot = row;
			}
		}
		[m[col], m[pivot]] = [m[pivot], m[col]];
		for (let row = 0; row < n; row++) {
			if (row !== col) {
				const factor = m[row][col] / m[col][col];
				for (let k = col; k <= n; k++) {
					m[row][k] -= factor * m[col][k];
				}
			}
		}
	}
	return m.map((row, i) => row[n] / m[i][i]);
}

function leastSquares(basis: Array<Array<number>>, values: Array<number>): Array<number> {
	const n = basis[0].length;
	const ata = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, k) => basis.reduce((sum, row) => sum + row[i] * row[k], 0)));
	const atb = Array.from({ length: n }, (_, i) => basis.reduce((sum, row, index) => sum + row[i] * values[index], 0));
	return solve(ata, atb);
}

function fitDirection(measurements: Array<TuningMeasurement>, direction: number): DirectionFit {
	const basis = measurements.map((m) => [1, m.magnitude * m.magnitude, 2 * m.magnitude * Math.cos(m.phase * Math.PI / 180), 2 * m.magnitude * Math.sin(m.phase * Math.PI / 180)]);
	const [u, v, a, b] = leastSquares(basis, measurements.map((m) => m.amplitudes[direction] ** 2));
	return { u, v, a, b };
}

// With the phase constrained to 0/180 the correction reduces to a signed magnitude and the model to A^2 = u + v m^2 + 2 a m
function fitDirectionConstrained(measurements: Array<TuningMeasurement>, direction: number): DirectionFit {
	const basis = measurements.map((m) => {
		const signedMagnitude = (m.phase === 180) ? -m.magnitude : m.magnitude;
		return [1, signedMagnitude * signedMagnitude, 2 * signedMagnitude];
	});
	const [u, v, a] = leastSquares(basis, measurements.map((m) => m.amplitudes[direction] ** 2));
	return { u, v, a, b: 0 };
}

// The sum of both directions' models is quadratic in the correction vector J e^(iO), so its minimum is closed-form
function getCombinedOptimum(measurements: Array<TuningMeasurement>, schedule: TuningSchedule, constrainPhase: boolean): { magnitude: number; phase: number } {
	const fits = constrainPhase ? [fitDirectionConstrained(measurements, 0), fitDirectionConstrained(measurements, 1)] : [fitDirection(measurements, 0), fitDirection(measurements, 1)];
	const v = fits[0].v + fits[1].v, a = fits[0].a + fits[1].a, b = fits[0].b + fits[1].b;
	const magnitude = Math.sqrt(a * a + b * b) / v;
	if (!(v > 0) || !isFinite(magnitude)) {
		// Degenerate fit, fall back to the lowest measured point
		const best = measurements.reduce((low, m) => (m.amplitude < low.amplitude) ? m : low);
		return { magnitude: best.magnitude, phase: best.phase };
	}
	return {
		magnitude: Math.min(magnitude, schedule.maxMagnitude),
		phase: constrainPhase ? ((a > 0) ? 180 : 0) : ((Math.atan2(-b, -a) * 180 / Math.PI) + 360) % 360
	};
}

/**
 * Tune the phase correction of one harmonic: measure the baseline and the phase probes, fit the vector-sum response
 * model per direction, refine with more probes around the fitted optimum and verify the refit optimum
 * @param harmonic Harmonic of the electrical cycle
 * @param measure Apply the given correction, record a move and return the amplitudes at the harmonic
 * @param constrainPhase Restrict the phase to 0 and 180 degrees, required when tuning the sine table via M569.2
 * @param schedule Search schedule
 * @returns Baseline and best measurement
 */
export async function tuneHarmonic(harmonic: number, measure: (magnitude: number, phase: number) => Promise<TuningMeasurement>, constrainPhase: boolean = false, schedule: TuningSchedule = defaultTuningSchedule): Promise<HarmonicTuningResult> {
	const measurements: Array<TuningMeasurement> = [];
	const track = async (magnitude: number, phase: number) => {
		const measurement = await measure(Math.min(magnitude, schedule.maxMagnitude), ((phase % 360) + 360) % 360);
		measurements.push(measurement);
		return measurement;
	};
	const trackSigned = (signedMagnitude: number) => track(Math.abs(signedMagnitude), (signedMagnitude < 0) ? 180 : 0);

	const baseline = await track(0, 0);
	for (const phase of constrainPhase ? [0, 180] : [0, 90, 180, 270]) {
		await track(schedule.probeMagnitude, phase);
	}
	let optimum = getCombinedOptimum(measurements, schedule, constrainPhase);

	// Refinement probes around the first optimum: on a circle of half the optimal magnitude, or at that offset along the signed magnitude axis
	const radius = Math.max(schedule.minRefineRadius, optimum.magnitude / 2);
	if (constrainPhase) {
		const center = (optimum.phase === 180) ? -optimum.magnitude : optimum.magnitude;
		await trackSigned(center - radius);
		await trackSigned(center + radius);
	} else {
		const centerX = optimum.magnitude * Math.cos(optimum.phase * Math.PI / 180), centerY = optimum.magnitude * Math.sin(optimum.phase * Math.PI / 180);
		for (const angle of [45, 135, 225, 315]) {
			const x = centerX + radius * Math.cos(angle * Math.PI / 180), y = centerY + radius * Math.sin(angle * Math.PI / 180);
			await track(Math.sqrt(x * x + y * y), Math.atan2(y, x) * 180 / Math.PI);
		}
	}
	optimum = getCombinedOptimum(measurements, schedule, constrainPhase);

	const verification = await measure(optimum.magnitude, optimum.phase);
	const best = (verification.amplitude < baseline.amplitude) ? verification : { harmonic, magnitude: 0, phase: 0, amplitude: baseline.amplitude, amplitudes: baseline.amplitudes };
	return { harmonic, baseline: baseline.amplitude, best };
}
