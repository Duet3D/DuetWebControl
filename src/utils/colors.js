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
	'yellow',
	'teal',
	'brown',
	'deep-orange',
	'pink',
	'blue-grey'
]

export function getHeaterColor(heater) {
	return heaterColors[heater % heaterColors.length] + '--text';
}

export function getExtraColor(sensor) {
	return heaterColors[(heaterColors.length - sensor - 1) % heaterColors.length] + '--text';
}

export function getRealHeaterColor(heater, extra) {
	const ghostSpan = document.createElement('span');
	document.body.querySelector('#app').appendChild(ghostSpan);
	ghostSpan.classList.add(extra ? getExtraColor(heater) : getHeaterColor(heater));
	const trueColor = window.getComputedStyle(ghostSpan).color;
	ghostSpan.remove();
	return trueColor;
}
