'use strict'

export function combine() {
	let result = '';
	Array.from(arguments).forEach(function(arg) {
		if (result !== '') {
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

export function extractFilePath(path) {
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

export function pathAffectsFilelist(path, directory, filelist) {
	if (!path || !directory || !filelist || path.length < directory.length) {
		return false;
	}

	if (path === directory) {
		return true;
	}

	if (path.startsWith(directory)) {
		const subPath = path.substr(directory.length + (directory.endsWith('/') ? 0 : 1));
		if (subPath === '' || filelist.some(file => subPath === file.name)) {
			return true;
		}
		return !filelist.some(file => file.isDirectory && subPath.startsWith(file.name + '/'));
	}
	return false;
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
	display: '0:/menu',
	gcodes: '0:/gcodes',
	macros: '0:/macros',
	filaments: '0:/filaments',
	sys: '0:/sys',
	www: '0:/www',

	configFile: '0:/sys/config.g',
	configBackupFile: '0:/sys/config.bak',
	dwcCacheFile: '0:/sys/dwc2cache.json',
	dwcFactoryDefaults: '0:/sys/dwc2defaults.json',
	dwcSettingsFile: '0:/sys/dwc2settings.json',
	heightmap: '0:/sys/heightmap.csv',

	combine,
	extractFileName,
	extractFilePath,

	pathAffectsFilelist,
	stripMacroFilename
}
