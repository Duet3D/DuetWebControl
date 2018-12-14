'use strict'

export function bitmapToArray(bitmap) {
	const result = [];
	let i = 0;
	do {
		const bit = (1 << i);
		if (bitmap & bit) {
			bitmap &= ~bit;
			result.push(i);
		}
		i++;
	} while (bitmap !== 0);
	return result;
}

export function isNumber(value) {
	return (value !== undefined && value !== null && value.constructor === Number && !isNaN(value) && isFinite(value));
}
