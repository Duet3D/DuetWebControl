'use strict'

export default {
	gcodes: '0:/gcodes',
	macros: '0:/macros',
	filaments: '0:/filaments',
	sys: '0:/sys',
	www: '0:/www',

	combine(a, b) {
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
	},

	extractFileName(path) {
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
}
