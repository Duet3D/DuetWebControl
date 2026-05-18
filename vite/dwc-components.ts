/**
 * dwc-components.ts
 *
 * Vite plugin that exposes every .vue file under src/components/ via a virtual
 * module:
 *
 *   virtual:dwc-components  -  default-exports a Record<name, Component> with
 *                              every DWC component, keyed by PascalCase file
 *                              base name (FileList, CodeButton, ...)
 *
 * Loaded lazily on first external-plugin load so the components stay in their
 * regular chunks for non-plugin use - the lazy import just adds dependency
 * edges to the existing chunks rather than bloating the main bundle.
 *
 * Plugin templates can then drop `<file-list>` or `<code-button>` straight in
 * (global app.component registration happens after the lazy load) without each
 * plugin having to import the component file explicitly. The exported map is
 * also surfaced on `window.DWC.Components` so plugins built with
 * `import { FileList } from "DuetWebControl/components"` resolve at runtime.
 */

import { readdirSync, statSync } from "fs";
import { resolve, join, relative } from "path";
import type { Plugin as VitePlugin } from "vite";

const VIRTUAL_ID = "virtual:dwc-components";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

export default function dwcComponents(): VitePlugin {
	const componentsDir = resolve(__dirname, "../src/components");

	function discover(): Array<{ name: string; importPath: string }> {
		const entries: Array<{ name: string; importPath: string }> = [];

		function walk(dir: string) {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				const full = join(dir, entry.name);
				if (entry.isDirectory()) {
					walk(full);
				} else if (entry.isFile() && full.endsWith(".vue")) {
					// PascalCase the file name (FileList.vue -> FileList) so the registered
					// component name matches Vue's `_resolveComponent("FileList")` lookup
					const name = entry.name.replace(/\.vue$/, "");
					const importPath = "@/components/" + relative(componentsDir, full).replace(/\\/g, "/");
					entries.push({ name, importPath });
				}
			}
		}

		walk(componentsDir);
		return entries;
	}

	return {
		name: "dwc-components",

		resolveId(id) {
			if (id === VIRTUAL_ID) {
				return RESOLVED_ID;
			}
			return null;
		},

		load(id) {
			if (id !== RESOLVED_ID) {
				return null;
			}

			const entries = discover();
			if (entries.length === 0) {
				return "export default {};\n";
			}

			// Generate one import per component file + a default-export Record so the
			// consumer can iterate with Object.entries(). Conflicting basenames win in
			// declaration order; on a name collision Vite would silently overwrite,
			// which we accept rather than refusing to build - duplicates are unusual
			const importLines = entries
				.map(({ name, importPath }) => `import ${name} from "${importPath}";`)
				.join("\n");
			const objectLines = entries.map(({ name }) => `\t${name},`).join("\n");
			return `${importLines}\n\nconst components = {\n${objectLines}\n};\n\nexport default components;\n`;
		},
	};
}
