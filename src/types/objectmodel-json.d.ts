// `@duet3d/objectmodel` exposes its generated sidecars via the package `exports` map, which the
// project's classic ("node") module resolution does not consult for subpaths. Declare the type here
// so the lazy `import("@duet3d/objectmodel/documentation.json")` in objectModelDoc.ts type-checks
// (webpack resolves the actual file at build time via the exports map)
declare module "@duet3d/objectmodel/documentation.json" {
	const documentation: Record<string, string | {
		summary?: string;
		remarks?: string;
		values?: Record<string, string | null>;
	}>;
	export default documentation;
}
