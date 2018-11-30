'use strict'

const heaterColors = [
	'primary',
	'red',
	'green',
	'orange',
	'grey',
	'lime',
	'black',
	'purple',
	'teal',
	'brown',
	'deep-orange',
	'pink',
	'blue-grey',
	'yellow'
]

export function getHeaterColor(heater) {
	return heaterColors[heater % heaterColors.length] + '--text';
}
