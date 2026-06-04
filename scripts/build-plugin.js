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
 *   <plugin-dir>/dist/                 - compiled IIFE bundle + optional CSS
 *   <plugin-dir>/<id>-<ver>.zip        - ZIP archive
 *
 * See build-plugin-pkg.js for full packaging with file list population.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, join, relative } from "path";
import { build } from "vite";
import vue from "@vitejs/plugin-vue";

const PLUGIN_GLOBALS = {
	"DuetWebControl": "DWC",
	"DuetWebControl/components": "DWC.Components",
	"vuetify/components": "DWC.VuetifyComponents",
	"@/i18n": "DWC.i18n",
	"@/utils/events": "DWC.Events",
	"vue": "DWC.Vue",
	"vue-router": "DWC.VueRouter",
	"pinia": "DWC.Pinia",
	"vue-i18n": "DWC.VueI18n",
	"@duet3d/objectmodel": "DWC.ObjectModel",
	"@duet3d/connectors": "DWC.Connectors",
};

// #region Shared helpers (also used by build-plugin-pkg.js)

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
		if (value === "auto") {
			return reference;
		}
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

	// Ship sourcemaps for prerelease plugin versions (alpha/beta/rc) so installs can be debugged in
	// the wild, like DWC's own build; stable releases skip them to keep the ZIP lean. The version is
	// already resolved (placeholders expanded) by the caller. DWC_SOURCEMAP=1 / =0 forces either way
	const sourcemap = process.env.DWC_SOURCEMAP !== undefined
		? process.env.DWC_SOURCEMAP !== "0"
		: /-(?:alpha|beta|rc)\b/i.test(manifest.version);

	const result = await build({
		root: pluginDir,
		plugins: [vue()],
		build: {
			outDir,
			emptyOutDir: true,
			lib: {
				entry: entryFile,
				name: manifest.id,
				formats: ["iife"],
			},
			rollupOptions: {
				// `DuetWebControl` is the canonical alias plugins should use, but accept
				// `@/plugins`, `@/stores*`, `@/i18n` too so a plugin developed in-tree
				// (under DWC's src/plugins/) can be shipped as external without changing
				// its imports. The regex matches both bare segments and sub-paths
				// (`@/stores`, `@/stores/machine`, etc.) - everything resolves to the
				// same `window.DWC.*` surface
				external: (id) => {
					return id === "DuetWebControl"
						|| id === "DuetWebControl/components"
						|| /^@\/(plugins|stores|i18n)(\/.*)?$/.test(id)
						|| id === "@/utils/events"
						|| id === "vuetify/components"
						|| ["vue", "vue-router", "pinia", "vue-i18n",
							"@duet3d/objectmodel", "@duet3d/connectors"].includes(id);
				},
				output: {
					// Content-hashed filenames for cache-busting, matching DWC's own build. A plugin
					// dir has no package.json, so the [name] token has nothing to derive from in lib
					// mode; use the manifest id explicitly so JS and CSS land as `<id>-<hash>.<ext>`
					entryFileNames: `${manifest.id}-[hash].js`,
					chunkFileNames: `${manifest.id}-[hash].js`,
					assetFileNames: `${manifest.id}-[hash][extname]`,
					globals: (id) => {
						// Named imports like `{ useMachineStore }` from @/plugins or @/stores paths
						// resolve to `DWC.useMachineStore` at runtime
						if (/^@\/(plugins|stores)(\/.*)?$/.test(id)) {
							return "DWC";
						}
						return PLUGIN_GLOBALS[id];
					},
				},
			},
			// Vite 8 ships with rolldown's built-in minifier - no extra deps required
			minify: true,
			sourcemap,
			cssCodeSplit: false,
		},
		define: {
			"process.env": "{}",
		},
	});

	// Filenames are content-hashed, so report back the actual emitted JS and CSS names rather
	// than letting callers reconstruct them from the manifest id
	const outputs = Array.isArray(result) ? result : [result];
	const emitted = outputs.flatMap((bundle) => bundle.output.map((chunk) => chunk.fileName));
	const jsFile = emitted.find((name) => name.endsWith(".js"));
	const cssFile = emitted.find((name) => name.endsWith(".css"));

	return { outDir, jsFile, cssFile };
}

export async function createZip(archiveDir, zipPath) {
	// jszip is already a DWC runtime dep (used by the file-list ZIP download / decompress
	// paths) so we don't add a build-only dep
	const { default: JSZip } = await import("jszip");
	const zip = new JSZip();

	function addRecursive(dir, zipFolder) {
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			const stat = statSync(full);
			if (stat.isDirectory()) {
				addRecursive(full, zipFolder.folder(entry));
			} else {
				zipFolder.file(entry, readFileSync(full));
			}
		}
	}

	addRecursive(archiveDir, zip);

	const buf = await zip.generateAsync({
		type: "nodebuffer",
		compression: "DEFLATE",
		compressionOptions: { level: 9 },
	});
	writeFileSync(zipPath, buf);
	return buf.length;
}

// #endregion

// #region Main

const resolvedPluginDir = parsePluginDir();
const manifest = readManifest(resolvedPluginDir);
resolveVersionPlaceholders(manifest);
const entryFile = findEntryFile(resolvedPluginDir);

console.log(`Building plugin: ${manifest.id} (${manifest.name}) v${manifest.version}`);
console.log(`Entry point: ${entryFile}`);

const { outDir, jsFile, cssFile } = await buildPlugin(resolvedPluginDir, manifest, entryFile);

// Build a simple ZIP containing compiled chunks + optional extra
// directories + plugin.json. File lists are NOT populated - use
// build-plugin-pkg.js for that

import { mkdirSync, cpSync } from "fs";

const assembleDir = resolve(resolvedPluginDir, "pkg");
mkdirSync(join(assembleDir, "dwc", "js"), { recursive: true });
mkdirSync(join(assembleDir, "dwc", "css"), { recursive: true });

let filesAdded = false;

// Copy JS (+ sourcemap when emitted)
if (jsFile) {
	const jsPath = join(outDir, jsFile);
	cpSync(jsPath, join(assembleDir, "dwc", "js", jsFile));
	if (existsSync(`${jsPath}.map`)) {
		cpSync(`${jsPath}.map`, join(assembleDir, "dwc", "js", `${jsFile}.map`));
	}
	filesAdded = true;
}

// Copy CSS (+ sourcemap) if generated
if (cssFile) {
	const cssPath = join(outDir, cssFile);
	cpSync(cssPath, join(assembleDir, "dwc", "css", cssFile));
	if (existsSync(`${cssPath}.map`)) {
		cpSync(`${cssPath}.map`, join(assembleDir, "dwc", "css", `${cssFile}.map`));
	}
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
} catch (e) {
	console.log(`\nPlugin assembled in: ${assembleDir}`);
	console.warn(`ZIP creation failed: ${e?.message ?? e}`);
}

console.log("Done!")

// #endregion
