/**
 * dwc-plugin-api.ts
 *
 * Vite plugin that exposes DWC's plugin-facing API as a virtual module:
 *
 *   virtual:dwc-plugin-api  -  default-exports a builder function returning a
 *                              flat object with every runtime export of
 *                              `@/plugins`, every `@/composables/*` and every
 *                              `@/stores/*` module, keyed by export name.
 *
 * scripts/build-plugin.js externalises a plugin's `@/plugins`, `@/composables/*`
 * and `@/stores/*` imports to one flat `window.DWC` global, so DWC must expose
 * every such export on `window.DWC`. Hand-mirroring that list silently drifts the
 * moment a module gains an export; spreading the module namespaces at runtime is worse, because
 * rolldown strips a namespace member that is only read through a spread when it
 * is also named-imported elsewhere (it never sees a concrete use).
 *
 * The fix is to discover the export names at build time and emit *concrete*
 * aliased named imports plus a builder that lists each one. A named import
 * referenced in the builder body is a static use rolldown must retain, so
 * nothing can be tree-shaken away. The scan runs every build, so a newly
 * exported symbol is picked up automatically - no manual list to keep in sync.
 *
 * It is a builder function, not an exported object literal, on purpose: these
 * modules form import cycles (a store imports @/plugins, which pulls in this
 * virtual module, which imports the store), so an object literal evaluated at
 * module-init would snapshot a binding still in its TDZ as `undefined`. Building
 * the object when the builder is called - from exposeGlobalAPI at startup, after
 * the whole graph has initialised - reads every binding live.
 *
 * Type-only exports (interfaces, type aliases, `export type { ... }`) are
 * skipped - they have no runtime value and importing one as a value would break
 * the build under isolatedModules.
 */

import { readdirSync, readFileSync } from "fs";
import { resolve, join } from "path";
import ts from "typescript";
import type { Plugin as VitePlugin } from "vite";

const VIRTUAL_ID = "virtual:dwc-plugin-api";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

/**
 * Collect the names of every runtime (value) export of a single source file.
 * Handles `export const/function/class/enum`, local and re-exported `export { ... }`,
 * and `export * from "..."` (recursing into the target). Skips interfaces, type
 * aliases and any `type`-flagged export specifier.
 */
function collectValueExports(filePath: string, seen = new Set<string>()): Array<string> {
	if (seen.has(filePath)) {
		return [];
	}
	seen.add(filePath);

	const source = ts.createSourceFile(filePath, readFileSync(filePath, "utf-8"), ts.ScriptTarget.Latest, true);
	const names: Array<string> = [];

	const hasExportModifier = (node: ts.Node): boolean =>
		ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

	for (const stmt of source.statements) {
		if (ts.isVariableStatement(stmt) && hasExportModifier(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				if (ts.isIdentifier(decl.name)) {
					names.push(decl.name.text);
				}
			}
		} else if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt) || ts.isEnumDeclaration(stmt))
			&& hasExportModifier(stmt) && stmt.name) {
			names.push(stmt.name.text);
		} else if (ts.isExportDeclaration(stmt) && !stmt.isTypeOnly) {
			if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
				for (const element of stmt.exportClause.elements) {
					if (!element.isTypeOnly) {
						names.push(element.name.text);
					}
				}
			} else if (!stmt.exportClause && stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
				// `export * from "./mod"` - recurse into the target to pull its value exports
				const target = resolveLocalModule(filePath, stmt.moduleSpecifier.text);
				if (target) {
					names.push(...collectValueExports(target, seen));
				}
			}
		}
	}

	return names;
}

/**
 * Resolve a relative module specifier to a .ts file on disk. Only relative paths are followed
 * (re-export chains within the source tree); bare/aliased specifiers are left to the bundler
 */
function resolveLocalModule(fromFile: string, specifier: string): string | null {
	if (!specifier.startsWith(".")) {
		return null;
	}
	const base = resolve(fromFile, "..", specifier);
	for (const candidate of [`${base}.ts`, join(base, "index.ts")]) {
		try {
			readFileSync(candidate);
			return candidate;
		} catch {
			// try next candidate
		}
	}
	return null;
}

export default function dwcPluginApi(): VitePlugin {
	const srcDir = resolve(__dirname, "../src");

	// Scan a flat src subdirectory (composables, stores) and return one module entry per .ts file,
	// keyed by the `@/<subdir>/<base>` import path the build externalises to the flat DWC global
	function scanDir(subdir: string): Array<{ importPath: string; names: Array<string> }> {
		const dir = join(srcDir, subdir);
		const result: Array<{ importPath: string; names: Array<string> }> = [];
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
				const base = entry.name.replace(/\.ts$/, "");
				result.push({ importPath: `@/${subdir}/${base}`, names: collectValueExports(join(dir, entry.name)) });
			}
		}
		return result;
	}

	function discover(): Array<{ importPath: string; names: Array<string> }> {
		return [
			// @/plugins barrel (its re-exports from ./layout and ./theme are captured by the scan)
			{ importPath: "@/plugins", names: collectValueExports(join(srcDir, "plugins/index.ts")) },
			// Every @/composables/* and @/stores/* module - the build externalises all of them to the flat DWC global
			...scanDir("composables"),
			...scanDir("stores"),
		];
	}

	return {
		name: "dwc-plugin-api",

		resolveId(id) {
			return id === VIRTUAL_ID ? RESOLVED_ID : null;
		},

		load(id) {
			if (id !== RESOLVED_ID) {
				return null;
			}

			const modules = discover();
			const importLines: Array<string> = [];
			const objectLines: Array<string> = [];
			let counter = 0;

			// A name exported by two modules would silently last-win in the object literal below.
			// Among these curated modules that should not happen; warn at build time so the clash
			// is caught at its source rather than a plugin resolving the wrong symbol at runtime
			const owner = new Map<string, string>();
			for (const { importPath, names } of modules) {
				for (const name of names) {
					const previous = owner.get(name);
					if (previous !== undefined) {
						this.warn(`Plugin API export "${name}" is exported by both ${previous} and ${importPath}; ${importPath} wins on window.DWC`);
					} else {
						owner.set(name, importPath);
					}
				}
			}

			// Aliased named imports avoid cross-module name collisions; the builder body
			// references each alias, which is the concrete static use that prevents tree-shaking.
			// Later modules win on a duplicate key (plugins barrel is emitted first, stores after)
			for (const { importPath, names } of modules) {
				const specifiers = names.map((name) => {
					const alias = `__dwc_${counter++}`;
					objectLines.push(`\t\t${JSON.stringify(name)}: ${alias},`);
					return `${name} as ${alias}`;
				});
				if (specifiers.length > 0) {
					importLines.push(`import { ${specifiers.join(", ")} } from ${JSON.stringify(importPath)};`);
				}
			}

			return `${importLines.join("\n")}\n\nexport default function buildPluginApiSurface() {\n\treturn {\n${objectLines.join("\n")}\n\t};\n}\n`;
		},
	};
}
