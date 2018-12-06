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

export function getExtraHeaterColor(heater) {
	return heaterColors[(heaterColors.length - heater - 1) % heaterColors.length] + '--text';
}

export function getRealHeaterColor(heater, extra) {
	const ghostSpan = document.createElement('span');
	ghostSpan.classList.add(extra ? getExtraHeaterColor(heater) : getHeaterColor(heater));
	document.body.appendChild(ghostSpan);
	const trueColor = window.getComputedStyle(ghostSpan).color;
	document.body.removeChild(ghostSpan);
	return trueColor;
}
