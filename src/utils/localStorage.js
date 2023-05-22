'use strict'

export const localStorageSupported = typeof localStorage !== 'undefined'

export function getLocalSetting(key, defaultValue) {
	if (!localStorageSupported) {
		return defaultValue;
	}

	let value = localStorage.getItem(key);
	if (value === null || value.length === 0 ||
		(defaultValue !== undefined && value.constructor !== defaultValue.constructor)) {
		return defaultValue;
	}
	return JSON.parse(value);
}

export function setLocalSetting(key, value) {
	if (localStorageSupported) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch (e) {
			console.warn("Failed to save value in local storage, it may be full", e);
		}
	}
	return false;
}

export function removeLocalSetting(key) {
	if (localStorageSupported) {
		localStorage.removeItem(key);
	}
}
