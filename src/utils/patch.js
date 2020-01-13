'use strict'

import Vue from 'vue'

export function arraySizesDiffer(a, b) {
	if (a instanceof Array) {
		if (a.length !== b.length) {
			return true;
		}

		for (let i = 0; i < a.length; i++) {
			if (a[i] instanceof Object && b[i] instanceof Object) {
				if (arraySizesDiffer(a[i], b[i])) {
					return true;
				}
			}
		}
	} else if (a instanceof Object) {
		for (let key in a) {
			if (a[key] instanceof Object && b[key] instanceof Object) {
				if (arraySizesDiffer(a[key], b[key])) {
					return true;
				}
			}
		}
	}
	return false;
}

export function quickPatch(a, b) {
	if (a instanceof Array) {
		for (let i = 0; i < b.length; i++) {
			if (i < a.length) {
				if (a[i] instanceof Object) {
					quickPatch(a[i], b[i]);
				} else {
					a[i] = b[i];
				}
			} else {
				a.push(b[i]);
			}
		}
	} else {
		for (let key in b) {
			if (a[key] instanceof Object) {
				quickPatch(a[key], b[key]);
			} else {
				a[key] = b[key];
			}
		}
	}
}

export default function patch(a, b, skipNonexistentFields = false, fullPath = '') {
	if (a instanceof Array) {
		while (a.length > b.length) {
			a.pop();
		}

		for (let i = 0; i < b.length; i++) {
			if (i < a.length) {
				if (a[i] !== b[i]) {
					if (a[i] && b[i] && a[i] instanceof Object) {
						patch(a[i], b[i], skipNonexistentFields, fullPath + '/' + i);
					} else {
						Vue.set(a, i, b[i]);
						//console.log(`[patch] ${fullPath}/${i} (${typeof b[i]})`);
					}
				}
			} else {
				a.push(b[i]);
			}
		}
	} else if (a instanceof Object) {
		for (let key in b) {
			if (skipNonexistentFields && a[key] === undefined) {
				console.warn(`[patch] Skipped merge of ${fullPath}/${key} because it does not exist in the source`);
			} else if (a[key] && b[key] && typeof a[key] !== typeof b[key]) {
				console.warn(`[patch] Skipped merge of ${fullPath}/${key} due to incompatible types ${typeof a[key]} vs ${typeof b[key]}`);
			} else if (a[key] instanceof Array) {
				patch(a[key], b[key] ? b[key] : [], skipNonexistentFields, fullPath + '/' + key);
			} else if (a[key] instanceof Object) {
				patch(a[key], b[key], skipNonexistentFields, fullPath + '/' + key);
			} else if (a[key] !== b[key]) {
				a[key] = b[key];
				//console.log(`[patch] ${fullPath}/${key} (${typeof b[key]})`);
			}
		}
	}
}
