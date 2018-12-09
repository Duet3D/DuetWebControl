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
	if (path.indexOf('/') !== -1) {
		const items = path.split('/');
		return items[items.length - 1];
	}
	if (path.indexOf('\\') !== -1) {
		const items = path.split('\\');
		return items[items.length - 1];
	}
	return path;
}

export function extractDirectory(path) {
	if (path.indexOf('/') !== -1) {
		const items = path.split('/');
		items.pop();
		return items.length ? items.reduce((a, b) => `${a}/${b}`) : '';
	}
	if (path.indexOf('\\') !== -1) {
		const items = path.split('\\');
		items.pop();
		return items.length ? items.reduce((a, b) => `${a}\\${b}`) : '';
	}
	return path;
}

export function stripMacroFilename(filename) {
	let label = filename;

	// Remove G-code file ending from name
	let match = filename.match(/(.*)\.(g|gc|gcode)$/i);
	if (match != null) {
		label = match[1];
	}

	// Users may want to index their macros, so remove starting numbers
	match = label.match(/^\d+_(.*)/);
	if (match != null) {
		label = match[1];
	}

	return label;
}

export default {
	gcodes: '0:/gcodes',
	macros: '0:/macros',
	filaments: '0:/filaments',
	sys: '0:/sys',
	www: '0:/www',

	combine,
	extractFileName,
	extractDirectory,

	stripMacroFilename
}
