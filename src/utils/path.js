'use strict'

export function combine() {
	let result = '';
	Array.from(arguments).forEach(function(arg) {
		if (arg.startsWith('/') || /(\d)+:.*/.test(arg)) {
			if (arg.endsWith('/')) {
				result = arg.substring(0, arg.length - 1);
			} else {
				result = arg;
			}
		} else {
			if (result !== '') {
				result += '/';
			}
			if (arg.endsWith('/')) {
				result += arg.substring(0, arg.length - 1);
			} else {
				result += arg;
			}
		}
	});
	return result;
}

export function equals(a, b) {
	if (a && b) {
		if (a.startsWith('/')) {
			a = '0:' + a;
		}
		if (a.endsWith('/')) {
			a = a.substring(0, a.length - 1);
		}
		if (b.startsWith('/')) {
			b = '0:' + b;
		}
		if (b.endsWith('/')) {
			b = b.substring(0, b.length - 1);
		}
	}
	return a === b;
}

export function extractDirectory(path) {
	if (!path) {
		return path;
	}
	if (path.indexOf('/') !== -1) {
		const items = path.split('/');
		items.pop();
		return items.join('/');
	}
	if (path.indexOf('\\') !== -1) {
		const items = path.split('\\');
		items.pop();
		return items.join('\\');
	}
	return path;
}

export function extractFileName(path) {
	if (!path) {
		return path;
	}
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

export function getVolume(path) {
	if (path) {
		const matches = /(\d+).*/.exec(path);
		if (matches) {
			return parseInt(matches[1]);
		}
	}
	return 0;
}

export function startsWith(a, b) {
	if (a && b) {
		if (a.startsWith('/')) {
			a = '0:' + a;
		}
		if (a.endsWith('/')) {
			a = a.substring(0, a.length - 1);
		}
		if (b.startsWith('/')) {
			b = '0:' + b;
		}
		if (b.endsWith('/')) {
			b = b.substring(0, b.length - 1);
		}
		return a.startsWith(b);
	}
	return false;
}

export function isGCodePath(path, gcodesDir) {
	path = path.toLowerCase();
	return (startsWith(path, pathObj.firmware) || startsWith(path, gcodesDir) ||
			path.endsWith('.g') || path.endsWith('.gcode') || path.endsWith('.gc') || path.endsWith('.gco') ||
			path.endsWith('.nc') || path.endsWith('.ngc') || path.endsWith('.tap'));
}

export function isSdPath(path) {
	return (startsWith(path, pathObj.filaments) ||
			startsWith(path, pathObj.firmware) ||
			startsWith(path, pathObj.gCodes) ||
			startsWith(path, pathObj.macros) ||
			startsWith(path, pathObj.menu) ||
			startsWith(path, pathObj.scans) ||
			startsWith(path, pathObj.system) ||
			startsWith(path, pathObj.web));
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

const pathObj = {
	filaments: '0:/filaments',
	firmware: '0:/sys',
	gCodes: '0:/gcodes',
	macros: '0:/macros',
	menu: '0:/menu',
	scans: '0:/scans',
	system: '0:/sys',
	web: '0:/www',

	dwcCacheFile: '0:/sys/dwc2cache.json',
	dwcFactoryDefaults: '0:/sys/dwc2defaults.json',
	dwcSettingsFile: '0:/sys/dwc2settings.json',

	configFile: 'config.g',
	configBackupFile: 'config.g.bak',
	heightmapFile: 'heightmap.csv',

	combine,
	equals,
	extractDirectory,
	extractFileName,
	getVolume,
	startsWith,

	isGCodePath,
	isSdPath,
	stripMacroFilename
}

export default pathObj
