/**
 * build-plugin.js
 *
 * Build script for external DWC plugins (compile + simple ZIP).
 *
 * Compiles a standalone plugin into an IIFE bundle with DWC modules
 * marked as externals, then creates a ZIP archive containing the
 * compiled chunks, optional extra directories (dsf, dwc, sd), and
 * the plugin.json manifest (with version placeholders resolved).
 *
 * Unlike build-plugin-pkg.js, this script does NOT auto-populate the
 * dwcFiles/dsfFiles/rrfFiles arrays in the manifest.
 *
 * The plugin source directory must contain:
 *   - plugin.json       (manifest)
 *   - An entry point:   index.ts / index.js / src/index.ts / dwc-src/index.ts
 *
 * Plugins import DWC APIs directly, just like built-in plugins:
 *
 *   import { registerRoute, registerCategory } from "DuetWebControl";
 *   import { ref, defineComponent } from "vue";
 *   import MyPage from "./MyPage.vue";
 *
 *   registerRoute(MyPage, {
 *     Plugins: {
 *       MyPlugin: { icon: "mdi-puzzle", caption: "My Plugin", path: "/Plugins/MyPlugin" }
 *     }
 *   });
 *
 * At runtime these imports resolve to `window.DWC` / `window.DWC.Vue` etc.,
 * which DWC sets up before loading any external plugin.
 *
 * Usage:
 *   node scripts/build-plugin.js <path-to-plugin-dir>
 *
 * Output:
 *   <plugin-dir>/dist/                 — compiled IIFE bundle + optional CSS
 *   <plugin-dir>/<id>-<ver>.zip        — ZIP archive (if archiver is installed)
 *
 * See build-plugin-pkg.js for full packaging with file list population.
 */

import { existsSync, readFileSync, createWriteStream } from "fs";
import { resolve, join } from "path";
import { build } from "vite";
import vue from "@vitejs/plugin-vue";

// ─── Shared helpers (also used by build-plugin-pkg.js) ───────────────

export function parsePluginDir() {
	const pluginDir = process.argv[2];
	if (!pluginDir) {
		console.error("Usage: node scripts/build-plugin.js <path-to-plugin-dir>");
		process.exit(1);
	}

	const resolvedPluginDir = resolve(pluginDir);
	if (!existsSync(resolvedPluginDir)) {
		console.error(`Plugin directory not found: ${resolvedPluginDir}`);
		process.exit(1);
	}
	return resolvedPluginDir;
}

export function readManifest(pluginDir) {
	const manifestPath = join(pluginDir, "plugin.json");
	if (!existsSync(manifestPath)) {
		console.error("Missing plugin.json in plugin directory");
		process.exit(1);
	}

	const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
	for (const field of ["id", "name", "author", "version"]) {
		if (!manifest[field]) {
			console.error(`plugin.json must have a '${field}' field`);
			process.exit(1);
		}
	}
	return manifest;
}

export function resolveVersionPlaceholders(manifest) {
	const dwcPackageJson = JSON.parse(
		readFileSync(resolve(import.meta.dirname, "..", "package.json"), "utf-8")
	);

	function resolveVersion(value, reference) {
		if (value === "auto") return reference;
		if (value === "auto-major") {
			const parts = reference.split(".");
			return parts.slice(0, 2).join(".");
		}
		return value;
	}

	manifest.version = resolveVersion(manifest.version, dwcPackageJson.version);
	if (manifest.dwcVersion) {
		manifest.dwcVersion = resolveVersion(manifest.dwcVersion, dwcPackageJson.version);
	}
	if (manifest.sbcDsfVersion) {
		manifest.sbcDsfVersion = resolveVersion(manifest.sbcDsfVersion, dwcPackageJson.version);
	}
	if (manifest.rrfVersion) {
		manifest.rrfVersion = resolveVersion(manifest.rrfVersion, dwcPackageJson.version);
	}
	return dwcPackageJson;
}

export function findEntryFile(pluginDir) {
	const candidates = [
		"index.ts", "index.js",
		join("dwc-src", "index.ts"), join("dwc-src", "index.js"),
		join("src", "index.ts"), join("src", "index.js"),
	];

	for (const candidate of candidates) {
		if (existsSync(join(pluginDir, candidate))) {
			return join(pluginDir, candidate);
		}
	}

	console.error(`No entry point found in ${pluginDir}`);
	process.exit(1);
}

export async function buildPlugin(pluginDir, manifest, entryFile) {
	const outDir = resolve(pluginDir, "dist");

	await build({
		root: pluginDir,
		plugins: [vue()],
		build: {
			outDir,
			emptyOutDir: true,
			lib: {
				entry: entryFile,
				name: manifest.id,
				formats: ["iife"],
				fileName: () => `${manifest.id}.js`,
			},
			rollupOptions: {
				external: [
					"DuetWebControl",
					"vue",
					"vue-router",
					"pinia",
					"vue-i18n",
					"@duet3d/objectmodel",
					"@duet3d/connectors",
				],
				output: {
					inlineDynamicImports: true,
					assetFileNames: `${manifest.id}.[ext]`,
					globals: {
						"DuetWebControl": "DWC",
						"vue": "DWC.Vue",
						"vue-router": "DWC.VueRouter",
						"pinia": "DWC.Pinia",
						"vue-i18n": "DWC.VueI18n",
						"@duet3d/objectmodel": "DWC.ObjectModel",
						"@duet3d/connectors": "DWC.Connectors",
					},
				},
			},
			minify: "terser",
			terserOptions: {
				keep_classnames: true,
				keep_fnames: true,
			},
			cssCodeSplit: false,
		},
		define: {
			"process.env": "{}",
		},
	});

	return outDir;
}

export async function createZip(archiveDir, zipPath) {
	const archiver = (await import("archiver")).default;

	const output = createWriteStream(zipPath);
	const archive = archiver("zip", { zlib: { level: 9 } });

	archive.pipe(output);
	archive.directory(archiveDir, false);

	await archive.finalize();
	await new Promise((resolve, reject) => {
		output.on("close", resolve);
		output.on("error", reject);
	});

	return archive.pointer();
}

// ─── Main ────────────────────────────────────────────────────────────

const resolvedPluginDir = parsePluginDir();
const manifest = readManifest(resolvedPluginDir);
resolveVersionPlaceholders(manifest);
const entryFile = findEntryFile(resolvedPluginDir);

console.log(`Building plugin: ${manifest.id} (${manifest.name}) v${manifest.version}`);
console.log(`Entry point: ${entryFile}`);

const outDir = await buildPlugin(resolvedPluginDir, manifest, entryFile);

// ─── Create ZIP archive ─────────────────────────────────────────────
// Build a simple ZIP containing compiled chunks + optional extra
// directories + plugin.json. File lists are NOT populated — use
// build-plugin-pkg.js for that.

import { mkdirSync, writeFileSync, cpSync } from "fs";

const assembleDir = resolve(resolvedPluginDir, "pkg");
mkdirSync(join(assembleDir, "dwc", "js"), { recursive: true });
mkdirSync(join(assembleDir, "dwc", "css"), { recursive: true });

let filesAdded = false;

// Copy JS
const jsFile = join(outDir, `${manifest.id}.js`);
if (existsSync(jsFile)) {
	cpSync(jsFile, join(assembleDir, "dwc", "js", `${manifest.id}.js`));
	filesAdded = true;
}

// Copy CSS (if generated)
const cssFile = join(outDir, `${manifest.id}.css`);
if (existsSync(cssFile)) {
	cpSync(cssFile, join(assembleDir, "dwc", "css", `${manifest.id}.css`));
	filesAdded = true;
}

// Copy extra directories (dsf, dwc, sd) if present
for (const extra of ["dsf", "dwc", "sd"]) {
	const extraDir = join(resolvedPluginDir, extra);
	if (existsSync(extraDir)) {
		cpSync(extraDir, join(assembleDir, extra), { recursive: true });
		filesAdded = true;
	}
}

if (!filesAdded) {
	console.error("No files could be added to the plugin package");
	process.exit(1);
}

// Write manifest (no file list population)
writeFileSync(join(assembleDir, "plugin.json"), JSON.stringify(manifest, null, 2));

// Create ZIP
try {
	const zipPath = resolve(resolvedPluginDir, `${manifest.id}-${manifest.version}.zip`);
	const bytes = await createZip(assembleDir, zipPath);
	console.log(`\nPlugin ZIP created: ${zipPath} (${bytes} bytes)`);
} catch {
	console.log(`\nPlugin assembled in: ${assembleDir}`);
	console.log("Install 'archiver' (npm i -D archiver) to auto-create ZIP files.");
}

console.log("Done!")
