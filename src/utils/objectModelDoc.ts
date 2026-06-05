// Object model documentation lookup
//
// Serves documentation for object-model paths from the `documentation.json` sidecar shipped by
// `@duet3d/objectmodel` (generated from DuetAPI.xml at the object model's build time). The sidecar
// is keyed by canonical OM path and carries the real serialised enum values, so lookups are a plain
// map access. It is imported lazily so its ~16 kB (gzipped) stays out of the eager app bundle and
// only loads when an editor hover or the Object Model browser first needs it. Consumed by the Monaco
// hover provider (src/utils/monaco.ts) and the Object Model browser plugin

// A documented path maps either to a bare summary string, or to an object carrying any of summary /
// remarks / per-value descriptions (the latter for enum and string-literal-union fields, where a
// value with no documented description maps to null)
type DocEntry = string | {
	summary?: string;
	remarks?: string;
	values?: Record<string, string | null>;
};

type DocMap = Record<string, DocEntry>;

/** Normalised documentation for a single OM path */
export interface ObjectModelDocumentation {
	summary: string | null;
	remarks: string | null;
	values: Record<string, string | null> | null;
}

let docs: DocMap | null = null;
let pending: Promise<DocMap> | null = null;

/**
 * Lazily fetch and cache the documentation sidecar. A failed chunk fetch (e.g. a 404 after a
 * redeploy, or the network dropping mid-update) resolves to an empty map rather than throwing, so
 * hovers and the browser degrade to "no documentation" instead of breaking; the next call retries
 */
function loadDocs(): Promise<DocMap> {
	if (docs !== null) {
		return Promise.resolve(docs);
	}
	if (pending === null) {
		pending = import("@duet3d/objectmodel/documentation.json")
			.then((module) => {
				docs = module.default as DocMap;
				return docs;
			})
			.catch((e) => {
				console.warn("Failed to load object model documentation", e);
				return {} as DocMap;
			})
			.finally(() => {
				pending = null;
			});
	}
	return pending;
}

/**
 * Collapse every array/dictionary index in an OM path down to `[]` so a live path resolves against
 * the canonical sidecar keys. Walks bracket depth rather than matching `[\d+]`, so nested index
 * expressions collapse correctly too, e.g. `tools[global.myVar[1]].offsets` -> `tools[].offsets`
 */
function canonicalPath(path: string): string {
	let out = "";
	let depth = 0;
	for (const ch of path) {
		if (ch === "[") {
			if (depth === 0) {
				out += "[]";
			}
			depth++;
		} else if (ch === "]") {
			if (depth > 0) {
				depth--;
			}
		} else if (depth === 0) {
			out += ch;
		}
	}
	return out;
}

/** Normalised documentation for an OM path, or null if undocumented (or the sidecar failed to load) */
export async function getObjectModelDocumentation(path: string): Promise<ObjectModelDocumentation | null> {
	const map = await loadDocs();
	const key = canonicalPath(path);
	// A collection element (e.g. `move.extruders[0]`) has no documentation of its own; fall back to
	// the collection property's documentation (`move.extruders`) by dropping the trailing `[]`
	const entry = map[key] ?? (key.endsWith("[]") ? map[key.slice(0, -2)] : undefined);
	if (entry === undefined) {
		return null;
	}
	if (typeof entry === "string") {
		return { summary: entry, remarks: null, values: null };
	}
	return { summary: entry.summary ?? null, remarks: entry.remarks ?? null, values: entry.values ?? null };
}

/**
 * Combined hover blob (summary, italic remarks and a Markdown value list) for the Monaco hover
 * provider, or null if the path isn't documented. The provider renders the result as an
 * IMarkdownString with `supportHtml`, so the HTML/Markdown mix is fine
 */
export async function getObjectModelDescription(path: string): Promise<string | null> {
	const doc = await getObjectModelDocumentation(path);
	if (doc === null) {
		return null;
	}
	let out = "";
	if (doc.summary) {
		out += doc.summary;
	}
	if (doc.remarks) {
		out += (out.length > 0 ? "<br><br>" : "") + `<i>${doc.remarks}</i>`;
	}
	if (doc.values) {
		let list = "";
		for (const [value, description] of Object.entries(doc.values)) {
			list += `\n- \`${value}\`${description ? ` - ${description}` : ""}`;
		}
		if (list.length > 0) {
			out += (out.length > 0 ? "\n\n" : "") + `**Values:**${list}`;
		}
	}
	return out.length > 0 ? out : null;
}
