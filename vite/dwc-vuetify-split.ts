/**
 * dwc-vuetify-split.ts
 *
 * Vite plugin that splits Vuetify components into two virtual modules:
 *
 *   virtual:dwc-vuetify-core    - components referenced anywhere under src/
 *   virtual:dwc-vuetify-extras  - the complement (components only external
 *                                 plugins might need)
 *
 * The core set is imported at boot from src/plugins/index.ts so every Vuetify
 * component DWC uses is registered globally and resolvable by name from any
 * template (including dynamically-loaded plugin templates). The extras module
 * is imported lazily on first external-plugin load, paying its ~150 KiB only
 * when external plugins actually arrive.
 *
 * Scanning is regex-based on .vue templates - good enough because DWC tags
 * Vuetify components as <v-foo> or <VFoo>. Dynamic <component :is> usage is
 * not detected; plugin authors who need that can import the component
 * directly from "vuetify/components" (also externalised in the plugin build).
 */

import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";
import { createRequire } from "module";
import type { Plugin as VitePlugin } from "vite";

const require = createRequire(import.meta.url);

const VIRTUAL_CORE = "virtual:dwc-vuetify-core";
const VIRTUAL_EXTRAS = "virtual:dwc-vuetify-extras";
const RESOLVED_CORE = "\0" + VIRTUAL_CORE;
const RESOLVED_EXTRAS = "\0" + VIRTUAL_EXTRAS;

// PascalCase form of every Vuetify component name actually exported by `vuetify/components`
// The root index.js does `export * from "./VFoo/index.js"` for each component subdirectory -
// but directory name does NOT always match the export name (VGrid/ exports VContainer,
// VCol, VRow, VSpacer, never VGrid itself). So we have to walk into each VFoo/index.js and
// collect the real `export { Xyz }` tokens
function loadAllComponentNames(): Array<string> {
	const rootPath = require.resolve("vuetify/components");
	const rootSource = readFileSync(rootPath, "utf-8");
	const rootDir = rootPath.replace(/[\\/][^\\/]+$/, "");

	const names = new Set<string>();

	function stripComments(source: string): string {
		// Strip /* ... */ block comments and // line comments before regex-matching
		// real exports - some Vuetify index files have commented-out `export { ... }`
		// lines (e.g. VCalendar's VCalendarCategory placeholders) that the naive match
		// would otherwise treat as real exports
		return source
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
	}

	function collectNamedExports(source: string) {
		const cleaned = stripComments(source);
		// Match `export { Foo }`, `export { Foo, Bar }`, `export { Foo as Bar }`, with or
		// without a trailing `from "..."`. Strip "as Aliased" -> we want the aliased name
		for (const match of cleaned.matchAll(/export\s*\{([^}]+)\}/g)) {
			for (const token of match[1].split(",")) {
				const stripped = token.trim().replace(/^.*\s+as\s+/, "");
				if (/^[A-Z][A-Za-z0-9]+$/.test(stripped)) {
					names.add(stripped);
				}
			}
		}
	}

	collectNamedExports(rootSource);

	// Follow the `export * from "./VFoo/index.js"` references one level deep
	for (const match of rootSource.matchAll(/export\s*\*\s*from\s*['"]\.\/([^'"]+)['"]/g)) {
		const childPath = join(rootDir, match[1]);
		try {
			collectNamedExports(readFileSync(childPath, "utf-8"));
		} catch {
			// transitions/ etc. that don't export top-level components - safe to skip
		}
	}

	return Array.from(names).sort();
}

function kebabToPascal(name: string): string {
	return name.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

function scanUsedComponents(srcDir: string): Set<string> {
	const used = new Set<string>();
	// Match both <v-foo> and <VFoo> tag openings (also <v-foo ... /> and <VFoo ... />)
	// The closing tag form `</v-foo>` is implied by the opening tag's presence so don't
	// double-scan
	const re = /<(v-[a-z][a-z0-9-]*|V[A-Z][A-Za-z0-9]*)(?=[\s/>])/g;

	function walk(dir: string) {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(full);
			} else if (entry.isFile() && full.endsWith(".vue")) {
				const source = readFileSync(full, "utf-8");
				for (const match of source.matchAll(re)) {
					const raw = match[1];
					const pascal = raw.startsWith("v-") ? kebabToPascal(raw) : raw;
					used.add(pascal);
				}
			}
		}
	}

	walk(srcDir);
	return used;
}

export default function dwcVuetifySplit(): VitePlugin {
	const srcDir = resolve(__dirname, "../src");

	let allComponents: Array<string> = [];
	let coreSet: Set<string> = new Set();
	let extrasList: Array<string> = [];

	function refresh() {
		allComponents = loadAllComponentNames();
		const used = scanUsedComponents(srcDir);
		// Only count components Vuetify actually exports - <v-foo> tags that aren't
		// real Vuetify components (user-defined Vue components with a v- prefix,
		// which would be unusual) shouldn't pollute the core set
		coreSet = new Set(allComponents.filter((name) => used.has(name)));
		extrasList = allComponents.filter((name) => !coreSet.has(name));
	}

	function emitReexport(names: Array<string>): string {
		if (names.length === 0) {
			return "export default {};\n";
		}
		// Default export gives an iterable Record<name, Component> for global registration;
		// named re-exports keep `import { VCard } from "virtual:..."` working too
		const importLine = `import { ${names.join(", ")} } from "vuetify/components";\n`;
		const objectLine = `const components = { ${names.join(", ")} };\n`;
		return importLine + objectLine + `export default components;\nexport { ${names.join(", ")} };\n`;
	}

	return {
		name: "dwc-vuetify-split",

		buildStart() {
			refresh();
		},

		configureServer(server) {
			// Re-scan when templates change/appear/vanish so the virtual modules stay accurate as
			// the set of used components evolves. refresh() alone is not enough: Vite caches the
			// emitted virtual module after its first load(), so a freshly-used <v-foo> would never
			// reach the browser and would render as an unresolved custom element. When the core
			// set actually changes, invalidate both virtual modules and force a reload so load()
			// runs again - the global registration in src/plugins/index.ts happens once at boot,
			// so an incremental HMR update could not pick up a new component anyway
			function rescan(path: string) {
				if (!path.endsWith(".vue")) {
					return;
				}
				const before = Array.from(coreSet).sort().join(",");
				refresh();
				if (Array.from(coreSet).sort().join(",") === before) {
					return;
				}
				for (const id of [RESOLVED_CORE, RESOLVED_EXTRAS]) {
					const mod = server.moduleGraph.getModuleById(id);
					if (mod) {
						server.moduleGraph.invalidateModule(mod);
					}
				}
				server.ws.send({ type: "full-reload" });
			}
			server.watcher.on("change", rescan);
			server.watcher.on("add", rescan);
			server.watcher.on("unlink", rescan);
		},

		resolveId(id) {
			if (id === VIRTUAL_CORE) {
				return RESOLVED_CORE;
			}
			if (id === VIRTUAL_EXTRAS) {
				return RESOLVED_EXTRAS;
			}
			return null;
		},

		load(id) {
			if (id === RESOLVED_CORE) {
				if (coreSet.size === 0) {
					refresh();
				}
				return emitReexport(Array.from(coreSet).sort());
			}
			if (id === RESOLVED_EXTRAS) {
				if (extrasList.length === 0) {
					refresh();
				}
				return emitReexport(extrasList);
			}
			return null;
		},
	};
}
