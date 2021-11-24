'use strict'

const fs = require('fs');
const archiver = require('archiver');
const { done, warn, error } = require('@vue/cli-shared-utils')

// Check if the plugin directory is valid
const param = process.argv[process.argv.length - 1];
let pluginDir;
try {
	if (fs.existsSync(param)) {
		pluginDir = fs.realpathSync(param);
		fs.accessSync(pluginDir + '/plugin.json', fs.constants.R_OK);
	} else if (fs.existsSync(`src/plugins/${param}`)) {
		pluginDir = fs.realpathSync(`src/plugins/${param}`);
	} else {
		throw new Error('Invalid directory');
	}
} catch {
	error(`Invalid plugin id or directory '${param}'`);
	return 1;
}

// Check if the DWC plugin directory is valid
let dwcPluginDir;
try {
	dwcPluginDir = fs.realpathSync('src/plugins');
	fs.accessSync(dwcPluginDir, fs.constants.R_OK | fs.constants.W_OK);
} catch {
	error('Missing src/plugins directory');
	return 1;
}

// Read DWC package info
let dwcManifest;
try {
	dwcManifest = JSON.parse(fs.readFileSync('package.json'));
} catch {
	error('Failed to read package.json');
	return 1;
}


// Read plugin manifest
let pluginManifest;
try {
	pluginManifest = JSON.parse(fs.readFileSync(pluginDir + '/plugin.json'));
} catch {
	error(`Failed to read ${pluginDir}/plugin.json`);
	return 1;
}

// Verify it
if (!pluginManifest.id) {
	error('Missing plugin id in plugin.json');
	return 1;
}
if (!pluginManifest.name) {
	error('Missing plugin name in plugin.json');
	return 1;
}
if (!pluginManifest.author) {
	error('Missing plugin author in plugin.json');
	return 1;
}
if (!pluginManifest.version) {
	error('Missing plugin version in plugin.json');
	return 1;
}
if (!pluginManifest.dwcVersion) {
	error('Missing DWC version dependency (dwcVersion) in plugin.json');
	return 1;
}

if (pluginDir.startsWith(dwcPluginDir)) {
	// Check whether the plugin IDs match
	if (pluginManifest.id !== param) {
		error('Plugin id must match the paramter');
		return 1;
	}
} else {
	// Make sure there is a src directory
	const srcDirectory = pluginDir + '/src';
	try {
		fs.accessSync(srcDirectory + '/', fs.constants.R_OK);
	} catch {
		error(`Missing src directory '${srcDirectory}'`);
		return 1;
	}

	// Delete old files
	try {
		fs.rmSync(dwcPluginDir + '/' + pluginManifest.id, { recursive: true, force: true });
	} catch {
		error(`Failed to delete directory 'src/plugins/${pluginManifest.id}'`);
		return 1;
	}

	// Copy src files into DWC
	try {
		fs.cpSync(srcDirectory, dwcPluginDir + '/' + pluginManifest.id, { recursive: true });
	} catch {
		error('Failed to copy src files');
		return 1;
	}

	// Backup and adjust src/plugins/index.js
	try {
		fs.copyFileSync(dwcPluginDir + '/index.js', dwcPluginDir + '/index.js.bak', fs.constants.COPYFILE_EXCL);
	} catch {
		// may happen if the .bak file is still present
	}

	try {
		const indexFile = fs.readFileSync(dwcPluginDir + '/index.js.bak', { encoding: 'utf8' }).split('\n');
		let adjustedIndexFile = '', markerFound = false;
		for (const line of indexFile) {
			if (line.indexOf('#DWC_PLUGIN#') !== -1) {
				adjustedIndexFile += '	new DwcPlugin({\n';
				adjustedIndexFile += `		id: ${JSON.stringify(pluginManifest.id)},\n`
				adjustedIndexFile += `		name: ${JSON.stringify(pluginManifest.name)},\n`,
					adjustedIndexFile += `		author: ${JSON.stringify(pluginManifest.author)},\n`
				adjustedIndexFile += `		version: ${JSON.stringify(pluginManifest.version)},\n`,
					adjustedIndexFile += '		loadDwcResources: () => import(\n';
				adjustedIndexFile += `			/* webpackChunkName: ${JSON.stringify(pluginManifest.id)} */\n`;
				adjustedIndexFile += `			'./${pluginManifest.id}/index.js'\n`;
				adjustedIndexFile += '		)\n';
				adjustedIndexFile += '	}),\n';
				markerFound = true;
			} else {
				adjustedIndexFile += line + '\n';
			}
		}

		if (markerFound) {
			fs.writeFileSync(dwcPluginDir + '/index.js', adjustedIndexFile);
		} else {
			error('Error" Failed to find marker in src/plugins/index.js');
			return 1;
		}
	} catch (e) {
		error('Failed to adjust src/plugins/index.js');
		return 1;
	}
}

// Build DWC without ZIP bundles
process.env.NOZIP = true;
const Service = require('@vue/cli-service/lib/Service')
const service = new Service(process.env.VUE_CLI_CONTEXT || process.cwd());
service
	.run('build', {}, ['build'])
	.then(() => {
		const distDir = fs.realpathSync('dist');
		if (fs.existsSync(distDir)) {
			// Make ZIP file
			const archive = archiver('zip', {});
			if (pluginManifest.version === 'auto') {
				archive.pipe(fs.createWriteStream(distDir + `/${pluginManifest.id}-${dwcManifest.version}.zip`));
			} else {
				archive.pipe(fs.createWriteStream(distDir + `/${pluginManifest.id}-${pluginManifest.version}.zip`));
			}
			archive.on('warning', function (err) {
				if (err.code === 'ENOENT') {
					warn(err);
				} else {
					error(err);
					process.exit(1);
				}
			});
			archive.on('error', function (err) {
				error(err);
				process.exit(1);
			});
			archive.on('end', function () {
				done(`Plugin ZIP file written to dist/${pluginManifest.id}-${pluginManifest.version}.zip`);
			});

			// Add plugin JSON
			if (pluginManifest.version === 'auto' ||
				pluginManifest.dwcVersion === 'auto' ||
				pluginManifest.dsfVersion === 'auto'
			) {
				if (pluginManifest.version === 'auto') {
					pluginManifest.version = dwcManifest.version;
				}
				if (pluginManifest.dwcVersion === 'auto') {
					pluginManifest.dwcVersion = dwcManifest.version;
				}
				if (pluginManifest.dsfVersion === 'auto') {
					pluginManifest.dsfVersion = dwcManifest.pkgVersion;
				}
				archive.append(JSON.stringify(pluginManifest, null, 2), { name: 'plugin.json' });
			} else {
				archive.file(pluginDir + '/plugin.json', { name: 'plugin.json' });
			}

			// Add generated webpack chunks to plugin ZIP
			let filesAdded = false;
			for (const file of fs.readdirSync(distDir + '/css')) {
				if (file.indexOf(pluginManifest.id + '.') === 0) {
					archive.file(distDir + '/css/' + file, { name: 'dwc/css/' + file });
					filesAdded = true;
				}
			}
			for (const file of fs.readdirSync(distDir + '/js')) {
				if (file.indexOf(pluginManifest.id + '.') === 0) {
					archive.file(distDir + '/js/' + file, { name: 'dwc/js/' + file });
					filesAdded = true;
				}
			}

			if (pluginManifest.dwcVersion && !filesAdded) {
				error('No Webpack chunks have be added to the ZIP archive. Make sure it is imported by src/plugins/index.js');
				process.exit(1);
			}

			// Add optional assets to plugin ZIP
			if (fs.existsSync(pluginDir + '/dsf/')) {
				archive.directory(pluginDir + '/dsf', 'dsf');
				filesAdded = true;
			}
			if (fs.existsSync(pluginDir + '/dwc/')) {
				archive.directory(pluginDir + '/dwc', 'dwc');
				filesAdded = true;
			}
			if (fs.existsSync(pluginDir + '/sd/')) {
				archive.directory(pluginDir + '/sd', 'sd');
				filesAdded = true;
			}

			// Make sure the ZIP isn't empty
			if (!filesAdded) {
				error('No files could be added to the plugin ZIP file');
				process.exit(1);
			}

			// Generate ZIP
			archive.finalize();

			if (!pluginDir.startsWith(dwcPluginDir)) {
				// Remove plugin source files again
				fs.rmSync(dwcPluginDir + '/' + pluginManifest.id, { recursive: true, force: true });

				// Restore src/plugins/index.js
				fs.copyFileSync(dwcPluginDir + '/index.js.bak', dwcPluginDir + '/index.js');
				fs.rmSync(dwcPluginDir + '/index.js.bak');
			}
		}
	})
	.catch(err => {
		error(err);
		process.exit(1);
	})

