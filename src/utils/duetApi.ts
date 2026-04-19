// Shared DuetAPI.xml service.
//
// Fetches the `DuetAPI.xml` documentation file from the connected machine, caches the parsed
// Document, and exposes lookup helpers for the object-model browser plugin and the Monaco-editor
// hover provider. Centralising both the download and the path-to-`<member>` resolution keeps
// the two call sites in lockstep: any mangling tweak (e.g. when RRF adds a new virtual property)
// applies everywhere.

import { useMachineStore } from "@/stores/machine";
import { getErrorMessage } from "@/utils/errors";

// Regex-based transforms mapping runtime object-model paths onto the C# property names produced
// by the XML doc compiler. The compiler drops the type segment (e.g. `ObjectModel.Move`) so we
// have to infer it from context.
const propertyAdjustments: Array<{ pattern: RegExp | string, substitute: string }> = [
	{ pattern: /(\[\d+\])+$/g, substitute: "" },
	{ pattern: /s\[\d+\]/g, substitute: "" },
	{ pattern: /.+\.mcutemp\./, substitute: "minmaxcurrent`1." },
	{ pattern: /.+\.v12\./, substitute: "minmaxcurrent`1." },
	{ pattern: /.+\.vin\./, substitute: "minmaxcurrent`1." },
	{ pattern: "fan.thermostatic", substitute: "fanthermostaticcontrol" },
	{ pattern: /^input\./, substitute: "inputchannel." },
	{ pattern: "heat.heater.model.pid.", substitute: "heatermodelpid." },
	{ pattern: "job.file.", substitute: "parsedfileinfo." },
	{ pattern: "parsedfileinfo.thumbnail.", substitute: "parsedthumbnail." },
	{ pattern: "move.axe.", substitute: "axis." },
	{ pattern: /^move.calibration.(final|initial)./, substitute: "movedeviations." },
	{ pattern: "move.idle.", substitute: "motorsidlecontrol." },
	{ pattern: /^move.queue\[\d+\]\./, substitute: "movequeueitem." },
	{ pattern: /^sensors.analog\[\d+\]\./, substitute: "analogsensor." },
	{ pattern: /^sensors.gpin\[\d+\]\./, substitute: "gpinputport." },
	{ pattern: /^state.gpout\[\d+\]\./, substitute: "gpoutputport." }
];

let apiFile: Document | null = null;
let apiFileError: string | null = null;
let loading: Promise<Document | null> | null = null;

/**
 * Kick off (or return the in-flight) load of `DuetAPI.xml`. Callers can await this before
 * treating `getDuetApiDocument` as authoritative; subsequent calls resolve immediately against
 * the cached Document.
 */
export function loadDuetApi(): Promise<Document | null> {
	if (apiFile !== null || apiFileError !== null) {
		return Promise.resolve(apiFile);
	}
	if (loading === null) {
		loading = (async () => {
			try {
				const machineStore = useMachineStore();
				const content: string = await machineStore.download(
					{ filename: "DuetAPI.xml", type: "text", rawPath: true },
					false, false, false
				);
				apiFile = new DOMParser().parseFromString(content, "application/xml");
				apiFileError = null;
				return apiFile;
			} catch (e) {
				apiFileError = getErrorMessage(e);
				console.warn(e);
				return null;
			} finally {
				loading = null;
			}
		})();
	}
	return loading;
}

/** Return the cached parsed Document, or null if it hasn't finished loading (or failed). */
export function getDuetApiDocument(): Document | null {
	return apiFile;
}

/** Return the last load error message, or null if the load hasn't failed. */
export function getDuetApiError(): string | null {
	return apiFileError;
}

/** Drop the cached DuetAPI.xml so the next `loadDuetApi()` re-downloads it (useful when switching machines). */
export function resetDuetApi(): void {
	apiFile = null;
	apiFileError = null;
	loading = null;
}

/**
 * Look up the `<member>` XML element that documents a given object-model path. Accepts both
 * literal paths (`move.extruders[0].pressureAdvance`) and the normalised form used by
 * MonacoTokens (`move.extruders[].pressureAdvance`); the latter is rewritten to `[0]` so the
 * propertyAdjustments regexes fire consistently. Returns null if no entry matches, mirroring
 * the multi-strategy lookup the object-model browser plugin has always used.
 */
export function lookupApiMember(doc: Document, path: string): Element | null {
	let selectedNode = path.toLowerCase().replace(/\[\]/g, "[0]");
	for (const adj of propertyAdjustments) {
		selectedNode = selectedNode.replace(adj.pattern as any, adj.substitute);
	}

	// Build a list of candidate names to try, progressively dropping leading segments so a
	// deeply-nested path falls back to the shortest-matching `<member>` (mirrors the collapsed-
	// type naming the XML compiler emits)
	const propertyNames = [selectedNode];
	const segments = selectedNode.split(".");
	if (segments.length > 2) {
		propertyNames.push(`${segments[0]}${segments[1]}.${segments.slice(2).join(".")}`);
		propertyNames.push(segments.slice(1).join("."));
		if (segments.length > 3) {
			propertyNames.push(`${segments[0]}${segments[1]}${segments[2]}.${segments.slice(3).join(".")}`);
			propertyNames.push(segments.slice(2).join("."));
		}
	}

	const members = doc.documentElement.getElementsByTagName("member");
	for (const propertyName of propertyNames) {
		for (let k = 0; k < members.length; k++) {
			const node = members[k];
			const tagName = node.getAttribute("name");
			if (tagName && tagName.startsWith("P:") && tagName.toLowerCase().endsWith(propertyName)) {
				return node;
			}
		}
	}
	return null;
}

/**
 * Pull a doc tag (`summary` / `remarks`) out of a `<member>` XML element and normalise it for
 * HTML rendering: strip whitespace, convert newlines to `<br>`, and flatten the C# doc compiler's
 * `<see cref="P:..."/>` refs to plain property paths.
 */
export function extractTag(member: Element, tag: string): string | null {
	const nodes = member.getElementsByTagName(tag);
	if (nodes.length === 0) {
		return null;
	}
	return nodes[0].innerHTML
		.trim()
		.replace(/\n/g, "<br>")
		.replace(/<see cref="P:DuetAPI\.ObjectModel\.(.*)".*\/>/g, "$1");
}

/** HTML summary text for an OM path, or null if not documented / XML not loaded yet. */
export function getApiSummary(path: string): string | null {
	if (apiFile === null) {
		return null;
	}
	const member = lookupApiMember(apiFile, path);
	return member ? extractTag(member, "summary") : null;
}

/** HTML remarks text for an OM path, or null if not documented / XML not loaded yet. */
export function getApiRemarks(path: string): string | null {
	if (apiFile === null) {
		return null;
	}
	const member = lookupApiMember(apiFile, path);
	return member ? extractTag(member, "remarks") : null;
}

/**
 * Convenience lookup used by the MonacoTokens hover callback. Returns a combined HTML blob
 * (summary, optional remarks) or null if the path isn't documented. Lazily kicks off the XML
 * download on the first call so hovers done before the editor finishes preloading still get a
 * populated tooltip once the fetch completes (the hover provider awaits the returned Promise).
 * The hover provider embeds the result into a Monaco IMarkdownString with `supportHtml: true`,
 * so returning raw HTML is fine.
 */
export async function getObjectModelDescription(path: string): Promise<string | null> {
	if (apiFile === null && apiFileError === null) {
		await loadDuetApi();
	}
	if (apiFile === null) {
		return null;
	}
	const member = lookupApiMember(apiFile, path);
	if (!member) {
		return null;
	}
	const summary = extractTag(member, "summary");
	const remarks = extractTag(member, "remarks");
	if (summary === null && remarks === null) {
		return null;
	}
	let out = "";
	if (summary !== null) {
		out += summary;
	}
	if (remarks !== null) {
		out += (out.length > 0 ? "<br><br>" : "") + `<i>${remarks}</i>`;
	}
	return out;
}
