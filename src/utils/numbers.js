'use strict'

export function isNumber(value) {
	return (value !== undefined && value !== null && value.constructor === Number && !isNaN(value) && isFinite(value));
}
