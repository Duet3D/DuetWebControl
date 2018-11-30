'use strict'

function merge(a, b) {
	if (a instanceof Array) {
		while (a.length > b.length) {
			a.pop();
		}

		for (let i = 0; i < b.length; i++) {
			if (i < a.length) {
				if (a[i] !== b[i]) {
					if (a[i] instanceof Object) {
						merge(a[i], b[i]);
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
			if (a[key] instanceof Array) {
				// Caveat: Without slice() no watcher gets triggered
				a[key] = merge(a[key].slice(), b[key]);
			} else if (a[key] instanceof Object) {
				merge(a[key], b[key]);
			} else if (a[key] !== b[key]) {
				a[key] = b[key];
			}
		}
	}
	return a;
}

export default merge
