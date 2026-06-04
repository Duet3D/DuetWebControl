/**
 * Flags if local storage is available for reading and writing. Detected with a trial write rather
 * than a `typeof` check: when a browser blocks storage (private mode, "block all cookies", a
 * sandboxed iframe) accessing `localStorage` throws a SecurityError instead of being undefined, so
 * a feature test is the only reliable probe
 */
export const localStorageSupported = (() => {
	try {
		const probe = "__dwc_probe__";
		localStorage.setItem(probe, probe);
		localStorage.removeItem(probe);
		return true;
	} catch {
		return false;
	}
})();

/**
 * Attempt to get a value from local storage
 * @param key Key to retrieve
 * @param defaultValue Default value
 * @returns Retrieved or default value
 */
export function getLocalSetting(key: string, defaultValue?: any): any {
	if (!localStorageSupported) {
		return defaultValue;
	}

	try {
		const value = localStorage.getItem(key);
		if (value === null || value.length === 0 || (defaultValue !== undefined && value.constructor !== defaultValue.constructor)) {
			return defaultValue;
		}
		return JSON.parse(value);
	} catch (e) {
		console.warn("Failed to read value from local storage", e);
		return defaultValue;
	}
}

/**
 * Attempt to save a value in local storage
 * @param key Key to save
 * @param value Value to save
 * @returns True on success, false otherwise
 */
export function setLocalSetting(key: string, value: any) {
	if (localStorageSupported) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return true
		} catch (e) {
			console.warn('Failed to save value in local storage, it may be full', e);
		}
	}
	return false;
}

/**
 * Attempt to remove a key from local storage
 * @param key Key to delete
 */
export function removeLocalSetting(key: string) {
	if (localStorageSupported) {
		try {
			localStorage.removeItem(key);
		} catch (e) {
			console.warn("Failed to remove value from local storage", e);
		}
	}
}
