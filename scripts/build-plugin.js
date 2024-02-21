"use strict"

const { execSync } = require("child_process");
const fs = require("fs");
const archiver = require("archiver");
const Service = require("@vue/cli-service/lib/Service");
const { done, warn, error } = require("@vue/cli-shared-utils")

// Check if the plugin directory is valid
const param = process.argv[process.argv.length - 1];
let pluginDir;
try {
	if (fs.existsSync(param)) {
		pluginDir = fs.realpathSync(param);
		fs.accessSync(pluginDir + "/plugin.json", fs.constants.R_OK);
	} else if (fs.existsSync(`src/plugins/${param}`)) {
		pluginDir = fs.realpathSync(`src/plugins/${param}`);
	} else {
		throw new Error("Invalid directory");
	}
} catch {
	error(`Invalid plugin id or directory "${param}"`);
	return 1;
}

// Check if the DWC plugin directory is valid
let dwcPluginDir;
try {
	dwcPluginDir = fs.realpathSync("src/plugins");
	fs.accessSync(dwcPluginDir, fs.constants.R_OK | fs.constants.W_OK);
} catch {
	error("Missing src/plugins directory");
	return 1;
}

// Read DWC package info
let dwcManifest;
try {
	dwcManifest = JSON.parse(fs.readFileSync("package.json"));
} catch {
	error("Failed to read package.json");
	return 1;
}


// Read plugin manifest
let pluginManifest;
try {
	pluginManifest = JSON.parse(fs.readFileSync(pluginDir + "/plugin.json"));
} catch {
	error(`Failed to read ${pluginDir}/plugin.json`);
	return 1;
}

// Verify it
if (!pluginManifest.id) {
	error("Missing plugin id in plugin.json");
	return 1;
}
if (!pluginManifest.name) {
	error("Missing plugin name in plugin.json");
	return 1;
}
if (!pluginManifest.author) {
	error("Missing plugin author in plugin.json");
	return 1;
}
if (!pluginManifest.version) {
	error("Missing plugin version in plugin.json");
	return 1;
}
if (!pluginManifest.dwcVersion) {
	error("Missing DWC version dependency (dwcVersion) in plugin.json");
	return 1;
}

if (pluginDir.startsWith(dwcPluginDir)) {
	// Check whether the plugin IDs match
	if (pluginManifest.id !== param) {
		error("Plugin id must match the parameter");
		return 1;
	}
} else {
	// Make sure there is a dwc-src or dwc directory
	const srcDirectory = fs.existsSync(pluginDir + "/dwc-src") ? pluginDir + "/dwc-src" : pluginDir + "/src";
	try {
		fs.accessSync(srcDirectory + "/", fs.constants.R_OK);
	} catch {
		error(`Missing src directory "${srcDirectory}"`);
		return 1;
	}

	// Delete old files
	try {
		fs.rmSync(dwcPluginDir + "/" + pluginManifest.id, { recursive: true, force: true });
	} catch {
		error(`Failed to delete directory "src/plugins/${pluginManifest.id}"`);
		return 1;
	}

	// Copy manifest and src files into DWC
	try {
		fs.cpSync(pluginDir + "/plugin.json", `${dwcPluginDir}/${pluginManifest.id}/plugin.json`);
		fs.cpSync(srcDirectory, dwcPluginDir + "/" + pluginManifest.id, { recursive: true });
	} catch {
		error("Failed to copy src files");
		return 1;
	}
}

// Webpack requires an index.js for proper loading, create it if necessary
let entryPoint = null;
if (fs.existsSync(`${dwcPluginDir}/${pluginManifest.id}/dwc-src/index.js`)) {
	entryPoint = "dwc-src/index.js";
} else if (fs.existsSync(`${dwcPluginDir}/${pluginManifest.id}/dwc-src/index.ts`)) {
	entryPoint = "dwc-src/index.ts";
} else if (fs.existsSync(`${dwcPluginDir}/${pluginManifest.id}/src/index.js`)) {
	entryPoint = "src/index.js";
} else if (fs.existsSync(`${dwcPluginDir}/${pluginManifest.id}/src/index.ts`)) {
	entryPoint = "src/index.ts";
} else if (fs.existsSync(`${dwcPluginDir}/${pluginManifest.id}/index.ts`)) {
	fs.renameSync(`${dwcPluginDir}/${pluginManifest.id}/index.ts`, `${dwcPluginDir}/${pluginManifest.id}/index-ts.ts`)
	entryPoint = "index-ts.ts";
}

if (entryPoint !== null) {
	const fd = fs.openSync(`${dwcPluginDir}/${pluginManifest.id}/index.js`, "w");
	fs.writeFileSync(fd, `import "./${entryPoint}";\n`);
	fs.closeSync(fd);
	entryPoint = `${dwcPluginDir}/${pluginManifest.id}/${entryPoint}`;
}

// Build DWC without ZIP bundles
process.env.NOZIP = true;
const service = new Service(process.env.VUE_CLI_CONTEXT || process.cwd());
service
	.run("build", {}, ["build"])
	.then(() => {
		const distDir = fs.realpathSync("dist");
		if (fs.existsSync(distDir)) {
			// Make ZIP file
			const archive = archiver("zip", {});
			if (pluginManifest.version === "auto") {
				archive.pipe(fs.createWriteStream(distDir + `/${pluginManifest.id}-${dwcManifest.version}.zip`));
			} else {
				archive.pipe(fs.createWriteStream(distDir + `/${pluginManifest.id}-${pluginManifest.version}.zip`));
			}
			archive.on("warning", function (err) {
				if (err.code === "ENOENT") {
					warn(err);
				} else {
					error(err);
					process.exit(1);
				}
			});
			archive.on("error", function (err) {
				error(err);
				process.exit(1);
			});
			archive.on("end", function () {
				done(`Plugin ZIP file written to dist/${pluginManifest.id}-${pluginManifest.version}.zip`);
			});

			// Add plugin JSON
			if (pluginManifest.version === "auto" ||
				pluginManifest.dwcVersion === "auto" || pluginManifest.dwcVersion === "auto-major" ||
				pluginManifest.dsfVersion === "auto" || pluginManifest.dsfVersion === "auto-major"
			) {
				if (pluginManifest.version === "auto") {
					pluginManifest.version = dwcManifest.version;
				}

				if (pluginManifest.dwcVersion === "auto") {
					pluginManifest.dwcVersion = dwcManifest.version;
				} else if (pluginManifest.dwcVersion === "auto-major") {
					const v = dwcManifest.version.split('.');
					pluginManifest.dwcVersion = `${v[0]}.${v[1]}`;
				}

				if (pluginManifest.dsfVersion === "auto") {
					pluginManifest.dsfVersion = dwcManifest.pkgVersion;
				} else if (pluginManifest.dsfVersion === "auto-major") {
					const v = dwcManifest.version.split('.');
					pluginManifest.dsfVersion = `${v[0]}.${v[1]}`;
				}
				archive.append(JSON.stringify(pluginManifest, null, 2), { name: "plugin.json" });
			} else {
				archive.file(pluginDir + "/plugin.json", { name: "plugin.json" });
			}

			// Add generated webpack chunks to plugin ZIP
			let filesAdded = false;
			for (const file of fs.readdirSync(distDir + "/css")) {
				if (file.indexOf(pluginManifest.id + ".") === 0) {
					archive.file(distDir + "/css/" + file, { name: "dwc/css/" + file });
					filesAdded = true;
				}
			}
			for (const file of fs.readdirSync(distDir + "/js")) {
				if (file.indexOf(pluginManifest.id + ".") === 0) {
					archive.file(distDir + "/js/" + file, { name: "dwc/js/" + file });
					filesAdded = true;
				}
			}

			if (pluginManifest.dwcVersion && !filesAdded) {
				error("No Webpack chunks have be added to the ZIP archive. Make sure it is imported by src/plugins/index.ts");
				process.exit(1);
			}

			// Add optional assets to plugin ZIP
			if (fs.existsSync(pluginDir + "/dsf/")) {
				archive.directory(pluginDir + "/dsf", "dsf");
				filesAdded = true;
			}
			if (fs.existsSync(pluginDir + "/dwc/")) {
				archive.directory(pluginDir + "/dwc", "dwc");
				filesAdded = true;
			}
			if (fs.existsSync(pluginDir + "/sd/")) {
				archive.directory(pluginDir + "/sd", "sd");
				filesAdded = true;
			}

			// Make sure the ZIP isn't empty
			if (!filesAdded) {
				error("No files could be added to the plugin ZIP file");
				process.exit(1);
			}

			// Generate ZIP
			archive.finalize();

			// Clean up again
			if (!pluginDir.startsWith(dwcPluginDir)) {
				// Remove plugin source files again
				fs.rmSync(dwcPluginDir + "/" + pluginManifest.id, { recursive: true, force: true });
			} else if (entryPoint !== null) {
				// Remove artificial index.js loader file again
				fs.unlinkSync(`${dwcPluginDir}/${pluginManifest.id}/index.js`);
				if (entryPoint.endsWith("-ts.ts")) {
					fs.renameSync(`${dwcPluginDir}/${pluginManifest.id}/index-ts.ts`, `${dwcPluginDir}/${pluginManifest.id}/index.ts`);
				}
			}
		}
	})
	.catch(err => {
		error(err);
		process.exit(1);
	});

