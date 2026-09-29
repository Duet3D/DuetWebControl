/**
 * Minimum-version checks for plugin manifests (`dwcMinVersion`, `rrfMinVersion`, `sbcDsfMinVersion`).
 *
 * Kept free of imports so it can be used anywhere (and exercised on its own). This is deliberately separate from
 * `checkVersion` in `./index`, which is a "same version prefix" test used for `dwcVersion`, `rrfVersion` and
 * `sbcDsfVersion`: a plugin built for DWC 3.7 loads on 3.7.x only. A minimum is the other question - "3.7 or newer".
 */

/**
 * Manifest fields that hold a minimum version
 */
export type MinVersionField = "dwcMinVersion" | "rrfMinVersion" | "sbcDsfMinVersion";

interface ParsedVersion {
	/** Numeric release segments, e.g. [3, 7, 0] for "3.7.0-rc.2" */
	numbers: Array<number>;

	/** Prerelease tag without its separator, e.g. "rc.2"; empty for a full release */
	prerelease: string;
}

function parseVersion(version: string): ParsedVersion | null {
	const match = /^[vV]?(\d+(?:\.\d+)*)(.*)$/.exec(version.trim());
	if (!match) {
		return null;
	}

	// Build metadata (after "+") never takes part in precedence. What is left of the tag also covers the older
	// firmware spellings without a separator ("3.4.0b3")
	const prerelease = match[2].split("+")[0].replace(/^[-.]+/, "");
	return { numbers: match[1].split(".").map((n) => parseInt(n, 10)), prerelease };
}

/**
 * Compare two dot-separated prerelease tags with semver precedence: numeric fields numerically, numeric before
 * alphanumeric, and a shorter set of fields before a longer one (`rc` < `rc.1`). No tag (a full release) is newest.
 */
function comparePrerelease(a: string, b: string): number {
	if (a === b) {
		return 0;
	}
	if (!a) {
		return 1;
	}
	if (!b) {
		return -1;
	}

	const aFields = a.split(".");
	const bFields = b.split(".");
	for (let i = 0; i < Math.max(aFields.length, bFields.length); i++) {
		const x = aFields[i];
		const y = bFields[i];
		if (x === undefined) {
			return -1;
		}
		if (y === undefined) {
			return 1;
		}

		const xNumeric = /^\d+$/.test(x);
		const yNumeric = /^\d+$/.test(y);
		if (xNumeric && yNumeric) {
			const diff = parseInt(x, 10) - parseInt(y, 10);
			if (diff !== 0) {
				return diff;
			}
		} else if (xNumeric !== yNumeric) {
			return xNumeric ? -1 : 1;
		} else if (x !== y) {
			return x < y ? -1 : 1;
		}
	}
	return 0;
}

/**
 * Compare two versions with full semver precedence (`3.7.0-rc.2` < `3.7.0`; a missing segment counts as 0)
 * @returns A positive number if a is newer than b, a negative number if it is older, else 0; NaN if either is unparsable
 */
export function compareVersions(a: string, b: string): number {
	const pa = parseVersion(a);
	const pb = parseVersion(b);
	if (!pa || !pb) {
		return NaN;
	}

	for (let i = 0; i < Math.max(pa.numbers.length, pb.numbers.length); i++) {
		const diff = (pa.numbers[i] ?? 0) - (pb.numbers[i] ?? 0);
		if (diff !== 0) {
			return diff;
		}
	}
	return comparePrerelease(pa.prerelease, pb.prerelease);
}

/**
 * Check whether a version satisfies a minimum.
 *
 * A minimum without a prerelease tag ("3.7", "3.7.1") is met by any version of that release line or newer, prereleases
 * of it included: 3.7.0-rc.2 satisfies "3.7", because a plugin that needs "3.7" should install on the 3.7 release
 * candidates it was written against. Only a minimum that names a prerelease ("3.7.0-rc.2") is compared prerelease by
 * prerelease. Anything unparsable fails, since it cannot be shown to satisfy the minimum.
 * @param actual Version that is running or installed (e.g. "3.7.0-rc.2")
 * @param minimum Minimum required version (e.g. "3.7"); nothing is required if this is empty
 */
export function checkMinVersion(actual: string, minimum: string | null | undefined): boolean {
	if (!minimum) {
		return true;
	}

	const parsedMinimum = parseVersion(minimum);
	const parsedActual = parseVersion(actual);
	if (!parsedMinimum || !parsedActual) {
		return false;
	}

	if (!parsedMinimum.prerelease) {
		parsedActual.prerelease = "";
	}
	for (let i = 0; i < Math.max(parsedActual.numbers.length, parsedMinimum.numbers.length); i++) {
		const diff = (parsedActual.numbers[i] ?? 0) - (parsedMinimum.numbers[i] ?? 0);
		if (diff !== 0) {
			return diff > 0;
		}
	}
	return comparePrerelease(parsedActual.prerelease, parsedMinimum.prerelease) >= 0;
}

/**
 * Get a minimum-version field from a plugin manifest.
 *
 * Takes any object because a manifest reaches DWC in two shapes: the raw `plugin.json` (install time) and the
 * `Plugin` model object. The model class comes from `@duet3d/objectmodel` and only keeps the properties it declares,
 * so until it declares these fields the second shape carries none of them.
 * @returns The trimmed minimum version, or null if the manifest does not set one
 */
export function getMinVersion(manifest: object | null | undefined, field: MinVersionField): string | null {
	const value = (manifest as Record<string, unknown> | null | undefined)?.[field];
	if (typeof value !== "string" || value.trim() === "") {
		return null;
	}
	return value.trim();
}
