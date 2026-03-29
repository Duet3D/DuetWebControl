/**
 * List of heater colors
 */
const heaterColors = [
	"primary",
	"red",
	"green",
	"orange",
	"grey",
	"lime",
	"black",
	"purple",
	"yellow",
	"teal",
	"brown",
	"deep-orange",
	"pink",
	"blue-grey",
]

/**
 * Get the heater color class of a given heater index
 * @param heaterIndex Heater index
 * @returns Color class
 */
export function getHeaterColor(heaterIndex: number) {
	return "text-" + heaterColors[((heaterIndex % heaterColors.length) + heaterColors.length) % heaterColors.length];
}

/**
 * Get the heater color class of a given extra sensor
 * @param sensorIndex Sensor index
 * @returns Color class
 */
export function getExtraColor(sensorIndex: number) {
	return "text-" + heaterColors[((heaterColors.length - sensorIndex - 1) % heaterColors.length + heaterColors.length) % heaterColors.length];
}
