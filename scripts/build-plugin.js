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
 *   <plugin-dir>/<id>-<ver>-srcmap.zip - sourcemaps of a stable build, held back from the archive
 *
 * See build-plugin-pkg.js for full packaging with file list population.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, cpSync, rmSync } from "fs";
import { resolve, join, relative, sep } from "path";
import { pathToFileURL } from "url";
import { spawnSync } from "child_process";
import { build } from "vite";
import vue from "@vitejs/plugin-vue";

// Absolute path of the DWC checkout these scripts live in. The type check and the version-placeholder
// resolver both anchor against it, so a plugin built from any working directory still finds DWC's
// tsconfig, node_modules and source tree
const DWC_ROOT = resolve(import.meta.dirname, "..");

const PLUGIN_GLOBALS = {
	"DuetWebControl": "DWC",
	"DuetWebControl/components": "DWC.Components",
	"vuetify/components": "DWC.VuetifyComponents",
	"vue": "DWC.Vue",
	"vue-router": "DWC.VueRouter",
	"pinia": "DWC.Pinia",
	"vue-i18n": "DWC.VueI18n",
	"@duet3d/objectmodel": "DWC.ObjectModel",
	"@duet3d/connectors": "DWC.Connectors",
	"@/i18n": "DWC.i18n",
	"@/utils/beep": "DWC.Beep",
	"@/utils/colors": "DWC.Colors",
	"@/utils/csv": "DWC.Csv",
	"@/utils/display": "DWC.Display",
	"@/utils/download": "DWC.Download",
	"@/utils/enums": "DWC.Enums",
	"@/utils/errors": "DWC.Errors",
	"@/utils/events": "DWC.Events",
	"@/utils/expression": "DWC.Expression",
	"@/utils/gcode": "DWC.Gcode",
	"@/utils/numbers": "DWC.Numbers",
	"@/utils/path": "DWC.Path",
	"@/utils/time": "DWC.Time",
	"@/utils/version": "DWC.Version",
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
		if (value === "auto-minor") {
			const parts = reference.split(".");
			return parts.slice(0, 3).join(".").split("-")[0];
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
	// the wild, like DWC's own build. Stable versions build them in hidden mode instead: no
	// sourceMappingURL reaches the bundle and the maps stay out of the plugin ZIP, they are packaged
	// as <id>-<version>-srcmap.zip for offline stack trace lookups instead. The version is already
	// resolved (placeholders expanded) by the caller. DWC_SOURCEMAP=1 / =hidden / =0 forces either way
	const sourcemapMode = process.env.DWC_SOURCEMAP;
	const isPrerelease = /-(?:alpha|beta|rc)\b/i.test(manifest.version);
	const sourcemap = (sourcemapMode === undefined) ? (isPrerelease ? true : "hidden") : (sourcemapMode === "hidden") ? "hidden" : sourcemapMode !== "0";

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
				// The `@/composables*`, `@/i18n`, `@/plugins`, `@/stores*` paths flatten to one
				// `window.DWC` surface, matched by the regex (both bare segments and sub-paths like
				// `@/stores/machine`). Everything else with a fixed handle - `DuetWebControl`, the
				// framework libraries and the public `@/utils/*` modules - is keyed in PLUGIN_GLOBALS,
				// so a plugin developed in-tree can be shipped as external without changing its imports
				external: (id) =>
					/^@\/(composables|i18n|plugins|stores)(\/.*)?$/.test(id)
					|| Object.prototype.hasOwnProperty.call(PLUGIN_GLOBALS, id),
				output: {
					// Content-hashed filenames for cache-busting, matching DWC's own build. A plugin
					// dir has no package.json, so the [name] token has nothing to derive from in lib
					// mode; use the manifest id explicitly so JS and CSS land as `<id>-<hash>.<ext>`
					entryFileNames: `${manifest.id}-[hash].js`,
					chunkFileNames: `${manifest.id}-[hash].js`,
					assetFileNames: `${manifest.id}-[hash][extname]`,
					globals: (id) => {
						// Named imports like `{ useMachineStore }` from @/composables, @/plugins or
						// @/stores paths resolve to `DWC.useMachineStore` at runtime
						if (/^@\/(composables|plugins|stores)(\/.*)?$/.test(id)) {
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

	return { outDir, jsFile, cssFile, hiddenSourcemaps: sourcemap === "hidden" };
}

async function writeZip(zip, zipPath) {
	const buf = await zip.generateAsync({
		type: "nodebuffer",
		compression: "DEFLATE",
		compressionOptions: { level: 9 },
	});
	writeFileSync(zipPath, buf);
	return buf.length;
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
	return writeZip(zip, zipPath);
}

/**
 * Package the maps of a hidden-sourcemap build into <id>-<version>-srcmap.zip next to the plugin
 * ZIP, stamped with the plugin id and version so a collected bundle stays identifiable.
 * Decode a stack trace against it with scripts/resolve-stack.js.
 * @returns Path of the ZIP, or null when the build emitted no maps
 */
export async function createSourcemapZip(outDir, pluginDir, manifest) {
	const maps = readdirSync(outDir).filter((name) => name.endsWith(".map"));
	if (maps.length === 0) {
		return null;
	}

	const { default: JSZip } = await import("jszip");
	const zip = new JSZip();
	for (const name of maps) {
		zip.file(name, readFileSync(join(outDir, name)));
	}
	zip.file("version.txt", `${manifest.id} ${manifest.version}\n`);

	const zipPath = resolve(pluginDir, `${manifest.id}-${manifest.version}-srcmap.zip`);
	await writeZip(zip, zipPath);
	return zipPath;
}

// #endregion

// #region Type checking

/**
 * Generate the ambient declarations for the two import aliases that have no real module behind them.
 *
 * `DuetWebControl` resolves at runtime to the flat `window.DWC` surface (every value export of
 * `@/plugins`, `@/composables/*` and `@/stores/*`, plus the i18n instance), so the declaration just
 * re-exports those modules - the `@/*` path mapping then points them at DWC's real source types.
 * `DuetWebControl/components` is DWC's public component palette; its named exports mirror the
 * generated GlobalComponents map so `import { CodeButton } from "DuetWebControl/components"` checks.
 */
function generateApiTypings() {
	const listModules = (subdir) => readdirSync(join(DWC_ROOT, "src", subdir), { withFileTypes: true })
		.filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".d.ts"))
		.map((e) => `@/${subdir}/${e.name.replace(/\.ts$/, "")}`);

	const reExports = ["@/plugins", ...listModules("composables"), ...listModules("stores")]
		.map((m) => `\texport * from ${JSON.stringify(m)};`)
		.join("\n");

	// The generated component map lists `Name: typeof import('./components/...vue')['default']`;
	// turn each into a named re-export so explicit component imports resolve to the real SFC type
	const componentDts = join(DWC_ROOT, "src", "components.d.ts");
	const componentExports = [...readFileSync(componentDts, "utf-8").matchAll(/(\w+):\s*typeof import\('\.\/([^']+)'\)/g)]
		.map(([, name, path]) => `\texport { default as ${name} } from ${JSON.stringify(`@/${path}`)};`)
		.join("\n");

	return `declare module "DuetWebControl" {\n${reExports}\n\texport { default as i18n } from "@/i18n";\n}\n\n`
		+ `declare module "DuetWebControl/components" {\n${componentExports}\n}\n`;
}

/**
 * Type-check a plugin's sources against DWC's real types before building.
 *
 * The plugin's `@/...` / `DuetWebControl` / framework imports are externalised at build time, so they
 * resolve to nothing on their own. To check them, the plugin's files are pulled into DWC's own type
 * environment: a throwaway tsconfig extends DWC's, includes the full `src/**` tree (so auto-imports,
 * GlobalComponents and Vuetify's global types are in scope exactly as for in-tree code) plus the
 * plugin's files, and maps every externalised module back to DWC's source / node_modules. vue-tsc
 * runs against that; only diagnostics in the plugin's own files fail the build - DWC-internal ones
 * (or any pre-existing in the host checkout) are filtered out so they aren't blamed on the plugin.
 *
 * The temp config lives under DWC's `node_modules/.cache` (gitignored) so module resolution finds
 * DWC's dependencies, and is removed afterwards - no `_typecheck_*` artifacts left in any tree.
 *
 * @returns true if the plugin type-checks, false if it has type errors (already printed)
 */
export function typeCheckPlugin(pluginDir) {
	const tmpDir = join(DWC_ROOT, "node_modules", ".cache", "dwc-plugin-typecheck");
	rmSync(tmpDir, { recursive: true, force: true });
	mkdirSync(tmpDir, { recursive: true });

	try {
		writeFileSync(join(tmpDir, "dwc-plugin-api.d.ts"), generateApiTypings());

		// Absolute path targets so no `baseUrl` is needed (it is deprecated in TS 6) and the config's
		// own location is irrelevant to resolution
		const libPaths = {};
		for (const lib of ["vue", "vue-router", "pinia", "vue-i18n", "vuetify", "@duet3d/objectmodel", "@duet3d/connectors"]) {
			libPaths[lib] = [join(DWC_ROOT, "node_modules", lib)];
			libPaths[`${lib}/*`] = [join(DWC_ROOT, "node_modules", lib, "*")];
		}

		const tsconfig = {
			extends: join(DWC_ROOT, "tsconfig.json"),
			compilerOptions: {
				paths: { "@/*": [join(DWC_ROOT, "src", "*")], ...libPaths },
				noEmit: true,
				composite: false,
				// Relax unused-locals: this is a type gate, not a linter, and an in-progress plugin
				// shouldn't fail to build over a stray import
				noUnusedLocals: false,
				noUnusedParameters: false,
			},
			include: [
				join(DWC_ROOT, "src/**/*"),
				join(DWC_ROOT, "src/**/*.vue"),
				join(tmpDir, "dwc-plugin-api.d.ts"),
				join(pluginDir, "**/*.ts"),
				join(pluginDir, "**/*.tsx"),
				join(pluginDir, "**/*.vue"),
			],
			exclude: [join(pluginDir, "dist"), join(pluginDir, "pkg"), join(pluginDir, "node_modules")],
		};
		const configPath = join(tmpDir, "tsconfig.json");
		writeFileSync(configPath, JSON.stringify(tsconfig, null, 2));

		console.log("Type-checking plugin sources...");
		const vueTsc = join(DWC_ROOT, "node_modules", ".bin", "vue-tsc");
		const result = spawnSync(vueTsc, ["--noEmit", "--pretty", "false", "-p", configPath], { cwd: DWC_ROOT, encoding: "utf-8" });
		const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

		// tsc prints one `path(line,col): error TS...: msg` header per diagnostic, file path relative to
		// cwd. Keep only the blocks whose file resolves inside the plugin dir; a header starts a block and
		// trailing indented lines (related info) belong to it
		const pluginPrefix = resolve(pluginDir) + sep;
		const headerRegex = /^(\S.*?)\((\d+),(\d+)\):\s+(?:error|warning)\s+TS\d+:/;
		const pluginErrors = [];
		let keeping = false;
		for (const line of output.split("\n")) {
			const header = headerRegex.exec(line);
			if (header) {
				keeping = (resolve(DWC_ROOT, header[1]) + sep).startsWith(pluginPrefix);
			}
			if (keeping) {
				pluginErrors.push(line);
			}
		}

		if (pluginErrors.length > 0) {
			console.error("\nPlugin type check failed:\n");
			console.error(pluginErrors.join("\n"));
			return false;
		}

		console.log("Type check passed");
		return true;
	} finally {
		if (!process.env.DWC_KEEP_TMP) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	}
}

// #endregion

// #region Main

// Only run when invoked directly. build-plugin-pkg.js imports the helpers above, and an unguarded
// top-level main would otherwise run this whole build as a side effect of that import
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const resolvedPluginDir = parsePluginDir();
	const manifest = readManifest(resolvedPluginDir);
	resolveVersionPlaceholders(manifest);
	const entryFile = findEntryFile(resolvedPluginDir);

	console.log(`Building plugin: ${manifest.id} (${manifest.name}) v${manifest.version}`);
	console.log(`Entry point: ${entryFile}`);

	if (!typeCheckPlugin(resolvedPluginDir)) {
		process.exit(1);
	}

	const { outDir, jsFile, cssFile, hiddenSourcemaps } = await buildPlugin(resolvedPluginDir, manifest, entryFile);

	// Build a simple ZIP containing compiled chunks + optional extra
	// directories + plugin.json. File lists are NOT populated - use
	// build-plugin-pkg.js for that
	const assembleDir = resolve(resolvedPluginDir, "pkg");
	mkdirSync(join(assembleDir, "dwc", "js"), { recursive: true });
	mkdirSync(join(assembleDir, "dwc", "css"), { recursive: true });

	let filesAdded = false;

	// Copy JS (+ sourcemap when shipped)
	if (jsFile) {
		const jsPath = join(outDir, jsFile);
		cpSync(jsPath, join(assembleDir, "dwc", "js", jsFile));
		if (!hiddenSourcemaps && existsSync(`${jsPath}.map`)) {
			cpSync(`${jsPath}.map`, join(assembleDir, "dwc", "js", `${jsFile}.map`));
		}
		filesAdded = true;
	}

	// Copy CSS (+ sourcemap) if generated
	if (cssFile) {
		const cssPath = join(outDir, cssFile);
		cpSync(cssPath, join(assembleDir, "dwc", "css", cssFile));
		if (!hiddenSourcemaps && existsSync(`${cssPath}.map`)) {
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

	if (hiddenSourcemaps) {
		const srcmapPath = await createSourcemapZip(outDir, resolvedPluginDir, manifest);
		if (srcmapPath) {
			console.log(`Sourcemaps: ${srcmapPath}`);
		}
	}

	console.log("Done!");
}

// #endregion
