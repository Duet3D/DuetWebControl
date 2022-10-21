/**
 * Combine given path elements to a single path
 * @param  {...any} args Path elements
 * @returns Combined path
 */
export function combine(...args: any[]) {
	let result = '';
	for (const arg of args) {
		if (arg.startsWith('/') || /(\d)+:.*/.test(arg)) {
			if (arg.endsWith('/')) {
				result = arg.substring(0, arg.length - 1);
			} else {
				result = arg;
			}
		} else {
			if (result !== "") {
				result += '/';
			}
			if (arg.endsWith('/')) {
				result += arg.substring(0, arg.length - 1);
			} else {
				result += arg;
			}
		}
	}
	return result;
}

/**
 * Check two paths for equality
 * @param a First path
 * @param b Second path
 * @returns Whether both paths are equal
 */
export function equals(a: string, b: string) {
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

/**
 * Get the directory from a given path
 * @param path Path
 * @returns Directory
 */
export function extractDirectory(path: string) {
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

/**
 * Get the filename from a given path
 * @param path Path
 * @returns Filename
 */
export function extractFileName(path: string) {
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

/**
 * Check if files are part of the given directory indicating if it needs to be refreshed
 * @param files File list
 * @param directory Directory
 * @returns If any files are part of the given directory
 */
export function filesAffectDirectory(files: Array<string>, directory: string) {
	return files.some(function(file) {
		return (equals(directory, file) ||
				equals(directory, extractDirectory(file)));
	});
}

/**
 * Get the volume from a given path
 * @param path Path
 * @returns Volume
 */
export function getVolume(path: string) {
	if (path) {
		const matches = /(\d+).*/.exec(path);
		if (matches) {
			return parseInt(matches[1]);
		}
	}
	return 0;
}

/**
 * Check if a path starts with the given value
 * @param path Path to check
 * @param value Expected start
 * @returns Whether the path starts with a given value
 */
export function startsWith(path: string, value: string) {
	if (path && value) {
		if (path.startsWith('/')) {
			path = "0:" + path;
		}
		if (path.endsWith('/')) {
			path = path.substring(0, path.length - 1);
		}
		if (value.startsWith('/')) {
			value = "0:" + value;
		}
		if (value.endsWith('/')) {
			value = value.substring(0, value.length - 1);
		}
		return path.startsWith(value);
	}
	return false;
}

/**
 * Check if the path is either a G-code file or if G-code files lie in it
 * @param path Path
 * @param gcodesDir  
 * @returns 
 */
export function isGCodePath(path: string, gcodesDir: string) {
	path = path.toLowerCase();
	return (startsWith(path, gcodesDir) ||
			path.endsWith('.g') || path.endsWith('.gcode') || path.endsWith('.gc') || path.endsWith('.gco') ||
			path.endsWith('.nc') || path.endsWith('.ngc') || path.endsWith('.tap'));
}

/**
 * Check if the given path should be addressed from the root of the SD card
 * @param path Path
 * @returns If it is an absolute path
 */
export function isSdPath(path: string) {
	return (startsWith(path, pathObj.filaments) ||
			startsWith(path, pathObj.firmware) ||
			startsWith(path, pathObj.gCodes) ||
			startsWith(path, pathObj.macros) ||
			startsWith(path, pathObj.menu) ||
			startsWith(path, pathObj.scans) ||
			startsWith(path, pathObj.system) ||
			startsWith(path, pathObj.web));
}

/**
 * Extract the plain filename without extension from a macro filename
 * @param filename Macro filename
 * @returns Stripped filename
 */
export function stripMacroFilename(filename: string) {
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

/**
 * Escape a filename to embed it in a G-code
 * @param filename Filename to escape
 * @returns Escaped filename
 */
export function escapeFilename(filename: string) {
    return filename.replace(/'/g, "''");
}

/**
 * Enumeration of default directories and files.
 * It exposes the functions above as well
 */
const pathObj = {
	filaments: '0:/filaments',
	firmware: '0:/sys',
	gCodes: '0:/gcodes',
	macros: '0:/macros',
	menu: '0:/menu',
	scans: '0:/scans',
	system: '0:/sys',
	web: '0:/www',

	dwcCacheFile: '0:/sys/dwc-cache.json',
	legacyDwcCacheFile: '0:/sys/dwc-cache.json',
	dwcSettingsFile: '0:/sys/dwc-settings.json',
	legacyDwcSettingsFile: '0:/sys/dwc2-settings.json',
	dwcFactoryDefaults: '0:/sys/dwc-defaults.json',
	legacyDwcFactoryDefaults: '0:/sys/dwc2-defaults.json',
	dwcPluginsFile: '0:/sys/dwc-plugins.json',

	boardFile: '0:/sys/board.txt',
	configFile: 'config.g',
	configBackupFile: 'config.g.bak',
	filamentsFile: 'filaments.csv',
	heightmapFile: 'heightmap.csv',

	accelerometer: '0:/sys/accelerometer',
	closedLoop: '0:/sys/closed-loop',

	combine,
	equals,
	extractDirectory,
	extractFileName,
	filesAffectDirectory,
	getVolume,
	startsWith,

	isGCodePath,
	isSdPath,
	stripMacroFilename
}

export default pathObj
