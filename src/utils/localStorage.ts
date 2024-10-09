/**
 * Flags if local storage is supported at all
 */
export const localStorageSupported = typeof localStorage !== "undefined"

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

	const value = localStorage.getItem(key);
	if (value === null || value.length === 0 || (defaultValue !== undefined && value.constructor !== defaultValue.constructor)) {
		return defaultValue;
	}
	return JSON.parse(value);
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
		localStorage.removeItem(key);
	}
}
