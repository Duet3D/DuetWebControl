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
	return heaterColors[heaterIndex % heaterColors.length] + "--text";
}

/**
 * Get the heater color class of a given extra sensor
 * @param sensorIndex Sensor index
 * @returns Color class
 */
export function getExtraColor(sensorIndex: number) {
	return heaterColors[(heaterColors.length - sensorIndex - 1) % heaterColors.length] + "--text";
}

/**
 * Get the effective color of a heater
 * @param heaterIndex Index of the heater
 * @param isExtra Whether it is an extra sensor
 * @returns Effective color
 */
export function getRealHeaterColor(heaterIndex: number, isExtra: boolean) {
	const ghostSpan = document.createElement("span");
	document.body.querySelector("#app")!.appendChild(ghostSpan);
	ghostSpan.classList.add(isExtra ? getExtraColor(heaterIndex) : getHeaterColor(heaterIndex));
	const trueColor = window.getComputedStyle(ghostSpan).color;
	ghostSpan.remove();
	return trueColor;
}
