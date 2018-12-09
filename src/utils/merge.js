'use strict'

export default function merge(a, b, skipNonexistentFields = false, fullPath = '') {
	if (a instanceof Array) {
		while (a.length > b.length) {
			a.pop();
		}

		for (let i = 0; i < b.length; i++) {
			if (i < a.length) {
				if (a[i] !== b[i]) {
					if (a[i] && b[i] && a[i] instanceof Object) {
						// There are no setters inside an array, see below
						merge(a[i], b[i], skipNonexistentFields, fullPath + '/' + i);
					} else {
						a[i] = b[i];
					}
				}
			} else {
				a.push(b[i]);
			}
		}
	} else if (a instanceof Object) {
		for (let key in b) {
			if (skipNonexistentFields && !a.hasOwnProperty(key)) {
				console.warn(`[merge] Skipped merge of ${fullPath}/${key} because it does not exist in the source`);
			} else if (a[key] && b[key] && typeof a[key] !== typeof b[key]) {
				console.warn(`[merge] Skipped merge of ${fullPath}/${key} due to incompatible types ${typeof a[key]} vs ${typeof b[key]}`);
			} else if (a[key] instanceof Array) {
				// Caveat: Without slice() no watcher gets triggered
				a[key] = merge(a[key].slice(), b[key] ? b[key] : [], skipNonexistentFields, fullPath + '/' + key);
			} else if (a[key] instanceof Object) {
				merge(a[key], b[key], skipNonexistentFields, fullPath + '/' + key);
			} else if (a[key] !== b[key]) {
				a[key] = b[key];
			}
		}
	}
	return a;
}
