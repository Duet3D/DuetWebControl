/**
 * build-plugin-pkg.js
 *
 * Build script for external DWC plugins (compile + full package).
 *
 * Like build-plugin.js, this compiles a standalone plugin into an IIFE
 * bundle. In addition, it automatically populates the dwcFiles, dsfFiles,
 * and rrfFiles arrays in the manifest by recursively scanning the dsf/,
 * dwc/, and sd/ directories. This creates a fully self-describing
 * installable package.
 *
 * The plugin source directory must contain:
 *   - plugin.json       (manifest)
 *   - An entry point:   index.ts / index.js / src/index.ts / dwc-src/index.ts
 *
 * Optional directories:
 *   - dsf/              - DSF plugin files  -> populates dsfFiles[]
 *   - dwc/              - extra DWC assets  -> populates dwcFiles[]
 *   - sd/               - SD card files     -> populates rrfFiles[]
 *
 * Usage:
 *   node scripts/build-plugin-pkg.js <path-to-plugin-dir>
 *
 * Output:
 *   <plugin-dir>/dist/                 - compiled IIFE bundle + optional CSS
 *   <plugin-dir>/pkg/                  - assembled package directory
 *   <plugin-dir>/<id>-<ver>.zip        - ZIP archive
 *   <plugin-dir>/<id>-<ver>-srcmap.zip - sourcemaps of a stable build, held back from the archive
 */

import { existsSync, mkdirSync, writeFileSync, cpSync, readdirSync, lstatSync, rmSync } from "fs";
import { resolve, join } from "path";
import {
	parsePluginDir,
	readManifest,
	resolveVersionPlaceholders,
	findEntryFile,
	buildPlugin,
	createZip,
	createSourcemapZip,
	installPluginDependencies,
	typeCheckPlugin,
} from "./build-plugin.js";

// #region Helpers

/**
 * Recursively scan a directory and collect all file paths relative to
 * the base directory.
 */
function collectFiles(dir, subDir) {
	const files = [];
	for (const file of readdirSync(dir)) {
		const fullPath = join(dir, file);
		const relativePath = subDir ? `${subDir}/${file}` : file;
		if (lstatSync(fullPath).isDirectory()) {
			files.push(...collectFiles(fullPath, relativePath));
		} else {
			files.push(relativePath);
		}
	}
	return files;
}

// #endregion

// #region Main

const resolvedPluginDir = parsePluginDir();
const manifest = readManifest(resolvedPluginDir);
resolveVersionPlaceholders(manifest);
const entryFile = findEntryFile(resolvedPluginDir);

console.log(`Building plugin package: ${manifest.id} (${manifest.name}) v${manifest.version}`);
console.log(`Entry point: ${entryFile}`);

// process.exit() would skip the finally block, so the type check result is acted on after cleanup
const cleanupNpm = installPluginDependencies(resolvedPluginDir);
let typeCheckPassed = false;
let buildOutput = null;
try {
	typeCheckPassed = typeCheckPlugin(resolvedPluginDir);
	if (typeCheckPassed) {
		buildOutput = await buildPlugin(resolvedPluginDir, manifest, entryFile);
	}
} finally {
	cleanupNpm();
}
if (!typeCheckPassed) {
	process.exit(1);
}

const { outDir, jsFile, cssFile, hiddenSourcemaps } = buildOutput;

// Wipe the assemble dir first, else content-hashed chunks of earlier builds linger and end up in the ZIP
const assembleDir = resolve(resolvedPluginDir, "pkg");
rmSync(assembleDir, { recursive: true, force: true });
mkdirSync(join(assembleDir, "dwc", "js"), { recursive: true });
mkdirSync(join(assembleDir, "dwc", "css"), { recursive: true });

let filesAdded = false;

manifest.dwcFiles ??= [];
manifest.dsfFiles ??= [];
manifest.rrfFiles ??= [];

if (jsFile) {
	const jsPath = join(outDir, jsFile);
	cpSync(jsPath, join(assembleDir, "dwc", "js", jsFile));
	manifest.dwcFiles.push(`js/${jsFile}`);
	// Ship the sourcemap alongside (when not hidden) and list it so it gets uploaded to the board -
	// the browser fetches it via the bundle's sourceMappingURL. It is not a .js/.css, so the
	// plugin loader skips it when loading resources
	if (!hiddenSourcemaps && existsSync(`${jsPath}.map`)) {
		cpSync(`${jsPath}.map`, join(assembleDir, "dwc", "js", `${jsFile}.map`));
		manifest.dwcFiles.push(`js/${jsFile}.map`);
	}
	filesAdded = true;
}

if (cssFile) {
	const cssPath = join(outDir, cssFile);
	cpSync(cssPath, join(assembleDir, "dwc", "css", cssFile));
	manifest.dwcFiles.push(`css/${cssFile}`);
	if (!hiddenSourcemaps && existsSync(`${cssPath}.map`)) {
		cpSync(`${cssPath}.map`, join(assembleDir, "dwc", "css", `${cssFile}.map`));
		manifest.dwcFiles.push(`css/${cssFile}.map`);
	}
	filesAdded = true;
}

const dsfDir = join(resolvedPluginDir, "dsf");
if (existsSync(dsfDir)) {
	cpSync(dsfDir, join(assembleDir, "dsf"), { recursive: true });
	manifest.dsfFiles.push(...collectFiles(dsfDir));
	filesAdded = true;
}

const extraDwcDir = join(resolvedPluginDir, "dwc");
if (existsSync(extraDwcDir)) {
	cpSync(extraDwcDir, join(assembleDir, "dwc"), { recursive: true });
	manifest.dwcFiles.push(...collectFiles(extraDwcDir));
	filesAdded = true;
}

const sdDir = join(resolvedPluginDir, "sd");
if (existsSync(sdDir)) {
	cpSync(sdDir, join(assembleDir, "sd"), { recursive: true });
	manifest.rrfFiles.push(...collectFiles(sdDir));
	filesAdded = true;
}

if (!filesAdded) {
	console.error("No files could be added to the plugin package");
	process.exit(1);
}

writeFileSync(join(assembleDir, "plugin.json"), JSON.stringify(manifest, null, 2));

try {
	const zipPath = resolve(resolvedPluginDir, `${manifest.id}-${manifest.version}.zip`);
	const bytes = await createZip(assembleDir, zipPath);
	console.log(`\nPlugin package ZIP created: ${zipPath} (${bytes} bytes)`);
} catch (e) {
	console.log(`\nPlugin package assembled in: ${assembleDir}`);
	console.warn(`ZIP creation failed: ${e?.message ?? e}`);
}

if (hiddenSourcemaps) {
	const srcmapPath = await createSourcemapZip(outDir, resolvedPluginDir, manifest);
	if (srcmapPath) {
		console.log(`Sourcemaps: ${srcmapPath}`);
	}
}

console.log("\nDone! Manifest file lists:");
if (manifest.dwcFiles.length) {
	console.log(`  dwcFiles: ${manifest.dwcFiles.join(", ")}`);
}
if (manifest.dsfFiles.length) {
	console.log(`  dsfFiles: ${manifest.dsfFiles.join(", ")}`);
}
if (manifest.rrfFiles.length) {
	console.log(`  rrfFiles: ${manifest.rrfFiles.join(", ")}`);
}

// #endregion
