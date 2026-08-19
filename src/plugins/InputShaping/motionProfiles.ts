/**
 * Filename pattern of a motion profile recorded by the input shaping wizard: run-axisStart-end-frequency-shaper[-damping][Hz][-accelerometer].csv
 */
export const motionProfileRegex = /^(\d+)-([a-zA-SU-Z]+)(-?\d+\.?\d*)-(-?\d+\.?\d*)-(\d+\.?\d*)-(\w+)-?(\d+\.?\d*)?(Hz)?(-(\d+\.?\d*))?\.csv/;

/**
 * Same with a tool number after the run number
 */
export const toolMotionProfileRegex = /^(\d+)-T(\d+)-([a-zA-Z]+)(-?\d+\.?\d*)-(-?\d+\.?\d*)-(\d+\.?\d*)-(\w+)[-]?(\d+\.?\d*)?(Hz)?(-(\d+\.?\d*))?\.csv/;

/**
 * Check if a filename is a motion profile of the input shaping wizard
 */
export function isMotionProfile(filename: string): boolean {
	return motionProfileRegex.test(filename) || toolMotionProfileRegex.test(filename);
}

/**
 * Get the input shaper that was active while a motion profile was recorded (e.g. "none" or "zvd")
 * @param filename Filename of the profile
 * @returns Shaper type or null if the filename is not a motion profile
 */
export function getMotionProfileShaper(filename: string): string | null {
	const matches = motionProfileRegex.exec(filename);
	if (matches) {
		return matches[6];
	}
	const toolMatches = toolMotionProfileRegex.exec(filename);
	return toolMatches ? toolMatches[7] : null;
}

/**
 * Get the shaper frequency that was active while a motion profile was recorded
 * @param filename Filename of the profile
 * @returns Frequency (in Hz) or null if the profile was recorded without a shaper or is not a motion profile
 */
export function getMotionProfileFrequency(filename: string): number | null {
	const matches = motionProfileRegex.exec(filename), value = matches ? matches[7] : toolMotionProfileRegex.exec(filename)?.[8];
	return value ? parseFloat(value) : null;
}

/**
 * Get the shaper damping factor that was active while a motion profile was recorded
 * @param filename Filename of the profile
 * @returns Damping factor or null if the filename does not carry one
 */
export function getMotionProfileDamping(filename: string): number | null {
	const matches = motionProfileRegex.exec(filename), value = matches ? matches[10] : toolMotionProfileRegex.exec(filename)?.[11];
	return value ? parseFloat(value) : null;
}
