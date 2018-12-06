'use strict'

export function combine(a, b) {
	let result = "";
	Array.from(arguments).forEach(function(arg) {
		if (result !== "") {
			result += '/';
		}

		if (arg.endsWith('/')) {
			result += arg.substr(0, arg.length - 1);
		} else {
			result += arg;
		}
	});
	return result;
}

export function extractFileName(path) {
	if (path.contains('/')) {
		const items = path.split('/');
		return items[items.length - 1];
	}
	if (path.contains('\\')) {
		const items = path.split('\\');
		return items[items.length - 1];
	}
	return path;
}

export default {
	gcodes: '0:/gcodes',
	macros: '0:/macros',
	filaments: '0:/filaments',
	sys: '0:/sys',
	www: '0:/www',

	combine,
	extractFileName
}
