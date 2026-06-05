// Shared DuetAPI.xml service
//
// Fetches the `DuetAPI.xml` documentation file from the connected machine, caches the parsed
// Document, and exposes lookup helpers for the object-model browser plugin and the Monaco-editor
// hover provider. Centralising both the download and the path-to-`<member>` resolution keeps
// the two call sites in lockstep: any mangling tweak (e.g. when RRF adds a new virtual property)
// applies everywhere

import { useMachineStore } from "@/stores/machine";
import { getErrorMessage } from "@/utils/errors";

// Regex-based transforms mapping runtime object-model paths onto the C# property names produced
// by the XML doc compiler. The compiler drops the type segment (e.g. `ObjectModel.Move`) so we
// have to infer it from context
const propertyAdjustments: Array<{ pattern: RegExp | string, substitute: string }> = [
	{ pattern: /(\[\d+\])+$/g, substitute: "" },
	{ pattern: /s\[\d+\]/g, substitute: "" },
	{ pattern: /.+\.mcutemp\./, substitute: "minmaxcurrent." },
	{ pattern: /.+\.v12\./, substitute: "minmaxcurrent." },
	{ pattern: /.+\.vin\./, substitute: "minmaxcurrent." },
	{ pattern: "fan.thermostatic.", substitute: "fanthermostaticcontrol." },
	{ pattern: /^input\./, substitute: "inputchannel." },
	{ pattern: "heat.heater.model.pid.", substitute: "heatermodelpid." },
	{ pattern: "job.file.", substitute: "gcodefileinfo." },
	{ pattern: "gcodefileinfo.thumbnail.", substitute: "thumbnailinfo." },
	{ pattern: "move.axe.", substitute: "axis." },
	{ pattern: /^move.calibration.(final|initial)./, substitute: "movedeviations." },
	{ pattern: "move.compensation.meshdeviation.", substitute: "movedeviations." },
	{ pattern: "move.compensation.livegrid.", substitute: "probegrid." },
	{ pattern: "move.idle.", substitute: "motorsidlecontrol." },
	{ pattern: "pressadv.", substitute: "extruderpressureadvance." },
	{ pattern: "state.beep.", substitute: "beeprequest." },
	{ pattern: /^move.queue\[\d+\]\./, substitute: "movequeueitem." },
	{ pattern: /^sensors.analog\[\d+\]\./, substitute: "analogsensor." },
	{ pattern: /^sensors.gpin\[\d+\]\./, substitute: "gpinputport." },
	{ pattern: /^state.gpout\[\d+\]\./, substitute: "gpoutputport." }
];

// Disabled until the object model ships a doc format that carries the actual encoded values. DuetAPI.xml
// only documents the C# member names, so the displayed values have the wrong case and numeric enums have no
// representation at all - they wouldn't match what the field serialises to. The map and builder below stay
// in place for when that format is available
const showEnumValues: boolean = false;

// Object-model fields whose value is an enum, keyed by the `<type>.<property>` tail of the resolved
// DuetAPI.xml member (lowercased, generic backtick stripped) and mapped to the enum type whose `F:` members
// document the individual values. This association has to be maintained by hand: the runtime model
// serialises enums as bare strings and the property's own XML doc carries no type reference, so neither
// runtime source reveals which enum a field uses
const enumFields: Record<string, string> = {
	"analogsensor.state": "TemperatureError",
	"analogsensor.type": "AnalogSensorType",
	"board.state": "BoardState",
	"directdisplayscreen.controller": "DirectDisplayController",
	"driverconfig.mode": "DriverMode",
	"dsf.communicationmethod": "CommunicationMethod",
	"endstop.type": "EndstopType",
	"filamentmonitor.enablemode": "FilamentMonitorEnableMode",
	"filamentmonitor.status": "FilamentMonitorStatus",
	"filamentmonitor.type": "FilamentMonitorType",
	"heater.state": "HeaterState",
	"heatermonitor.action": "HeaterMonitorAction",
	"heatermonitor.condition": "HeaterMonitorCondition",
	"httpendpoint.endpointtype": "HttpEndpointType",
	"inputchannel.compatibility": "Compatibility",
	"inputchannel.distanceunit": "DistanceUnit",
	"inputchannel.state": "InputChannelState",
	"inputshaping.type": "InputShapingType",
	"kinematics.name": "KinematicsName",
	"ledstrip.colororder": "LedStripColorOrder",
	"ledstrip.type": "LedStripType",
	"message.type": "MessageType",
	"messagebox.mode": "MessageBoxMode",
	"movecompensation.type": "MoveCompensationType",
	"networkinterface.activeprotocols": "NetworkProtocol",
	"networkinterface.type": "NetworkInterfaceType",
	"probe.type": "ProbeType",
	"spindle.state": "SpindleState",
	"spindle.type": "SpindleType",
	"state.loglevel": "EventLogLevel",
	"state.machinemode": "MachineMode",
	"state.status": "MachineStatus",
	"tool.state": "ToolState",
	"usersession.accesslevel": "AccessLevel",
	"usersession.sessiontype": "SessionType"
};

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
		selectedNode = selectedNode.replace(adj.pattern, adj.substitute);
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

	// For top-level paths, anchor on the ObjectModel container so e.g. `boards` doesn't pull
	// in `Limits.Boards`. The XML form is `P:DuetAPI.ObjectModel.ObjectModel.<Property>`
	if (segments.length === 1) {
		const exact = `.objectmodel.${selectedNode}`;
		for (let k = 0; k < members.length; k++) {
			const node = members[k];
			const tagName = node.getAttribute("name");
			if (tagName && tagName.startsWith("P:") && tagName.toLowerCase().endsWith(exact)) {
				return node;
			}
		}
	}

	// Restrict matching to the ObjectModel namespace. Several command DTOs (e.g.
	// `DuetAPI.Commands.WriteMessage`, `AddHttpEndpoint`, `AddUserSession`) share property names with
	// their object-model counterparts and would otherwise win the suffix match for paths like
	// `messages[].content` or `sbc.dsf.httpEndpoints[].path`
	for (const propertyName of propertyNames) {
		for (let k = 0; k < members.length; k++) {
			const node = members[k];
			const tagName = node.getAttribute("name")?.toLowerCase();
			if (tagName && tagName.startsWith("p:duetapi.objectmodel.") && tagName.endsWith(propertyName)) {
				return node;
			}
		}
	}
	return null;
}

/** Locate the `<member>` element whose `name` attribute matches `name` exactly (the form `<see cref>`/`<inheritdoc cref>` use). */
function getApiMemberByName(doc: Document, name: string): Element | null {
	const members = doc.documentElement.getElementsByTagName("member");
	for (let k = 0; k < members.length; k++) {
		if (members[k].getAttribute("name") === name) {
			return members[k];
		}
	}
	return null;
}

/** Return the `cref` of a member's `<inheritdoc>`, or null if it has none or a bare `<inheritdoc/>`. */
function getInheritDocCref(member: Element): string | null {
	const nodes = member.getElementsByTagName("inheritdoc");
	return nodes.length > 0 ? nodes[0].getAttribute("cref") : null;
}

/**
 * Pull a doc tag (`summary` / `remarks`) out of a `<member>` XML element and normalise it for
 * HTML rendering: strip whitespace, convert newlines to `<br>`, and flatten the C# doc compiler's
 * `<see cref="P:..."/>` refs to plain property paths.
 *
 * When the member carries no own copy of the tag but documents itself via `<inheritdoc cref="..."/>`
 * (emitted when a type re-declares a member and reuses another member's docs), follow the cref chain
 * and read the tag from the referenced member instead. Bare `<inheritdoc/>` without a cref can't be
 * resolved - the XML doesn't encode the inheritance hierarchy needed to find the base member - so
 * those still yield null.
 */
export function extractTag(doc: Document, member: Element, tag: string): string | null {
	let current: Element | null = member;
	const visited = new Set<string>();
	while (current !== null) {
		const nodes = current.getElementsByTagName(tag);
		if (nodes.length > 0) {
			return nodes[0].innerHTML
				.trim()
				.replace(/\n/g, "<br>")
				.replace(/<see cref="P:DuetAPI\.ObjectModel\.(.*)".*\/>/g, "$1");
		}
		const cref = getInheritDocCref(current);
		if (cref === null || visited.has(cref)) {
			return null;
		}
		visited.add(cref);
		current = getApiMemberByName(doc, cref);
	}
	return null;
}

/** HTML summary text for an OM path, or null if not documented / XML not loaded yet. */
export function getApiSummary(path: string): string | null {
	if (apiFile === null) {
		return null;
	}
	const member = lookupApiMember(apiFile, path);
	return member ? extractTag(apiFile, member, "summary") : null;
}

/** HTML remarks text for an OM path, or null if not documented / XML not loaded yet. */
export function getApiRemarks(path: string): string | null {
	if (apiFile === null) {
		return null;
	}
	const member = lookupApiMember(apiFile, path);
	return member ? extractTag(apiFile, member, "remarks") : null;
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
	const summary = extractTag(apiFile, member, "summary");
	const remarks = extractTag(apiFile, member, "remarks");
	const memberName = member.getAttribute("name")?.toLowerCase().replace(/^p:duetapi\.objectmodel\./, "").replace(/`\d+/g, "") ?? "";
	const enumType = showEnumValues ? enumFields[memberName] : undefined;
	const values = enumType ? getEnumValueDoc(apiFile, enumType) : null;
	if (summary === null && remarks === null && values === null) {
		return null;
	}
	let out = "";
	if (summary !== null) {
		out += summary;
	}
	if (remarks !== null) {
		out += (out.length > 0 ? "<br><br>" : "") + `<i>${remarks}</i>`;
	}
	if (values !== null) {
		out += (out.length > 0 ? "\n\n" : "") + values;
	}
	return out;
}

/**
 * Build a Markdown value list for an enum type, matching the parameter hover's `**Values:**` layout.
 * Each entry is the documented enum member name plus its `F:` summary. Returns null if the type has no
 * documented values.
 */
function getEnumValueDoc(doc: Document, enumType: string): string | null {
	const prefix = `f:duetapi.objectmodel.${enumType.toLowerCase()}.`;
	const members = doc.documentElement.getElementsByTagName("member");
	let out = "";
	for (let k = 0; k < members.length; k++) {
		const node = members[k];
		const name = node.getAttribute("name");
		if (!name || !name.toLowerCase().startsWith(prefix)) {
			continue;
		}
		const value = name.substring(name.lastIndexOf(".") + 1);
		const summary = extractTag(doc, node, "summary");
		out += `\n- \`${value}\`${summary !== null ? ` - ${summary}` : ""}`;
	}
	return out.length > 0 ? `**Values:**${out}` : null;
}
