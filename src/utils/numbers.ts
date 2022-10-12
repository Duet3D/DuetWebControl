import Vue from "vue";

/**
 * Check if a value is a number.
 * This is becoming obsolete due to the transition to TypeScript
 * @param value Arbitrary value
 * @returns Whether the value is a finite number
 */
export function isNumber(value: any) {
	return (value !== undefined && value !== null && value.constructor === Number && !isNaN(value as number) && isFinite(value as number));
}

// Note: This isn't registered via d.ts (yet?)
Vue.prototype.isNumber = isNumber;
