// Minimal semver-style comparison for the version-compatibility check. We only need to
// detect whether two firmware versions disagree, and if so, whether the difference is
// "patch-level" (warning) or "major/minor" (error). Pulling in semver(~250 KiB) just for
// this would be overkill

export type VersionDiff = "major" | "minor" | "patch" | "prerelease" | null;

interface ParsedVersion {
	major: number;
	minor: number;
	patch: number;
	prerelease: string;
}

function parse(v: string): ParsedVersion | null {
	const stripped = v.trim().replace(/^[vV]/, "");
	const match = stripped.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+](.*))?$/);
	if (!match) {
		return null;
	}
	return {
		major: parseInt(match[1], 10),
		minor: match[2] ? parseInt(match[2], 10) : 0,
		patch: match[3] ? parseInt(match[3], 10) : 0,
		prerelease: match[4] ?? "",
	};
}

// Returns the highest level at which two versions differ, or null if equal. Leading "v"
// and prerelease/build tags are tolerated; missing minor/patch components are treated as 0
// so e.g. "3.5" matches "3.5.0"
export function versionDiff(a: string, b: string): VersionDiff {
	const pa = parse(a);
	const pb = parse(b);
	if (!pa || !pb) {
		return null;
	}
	if (pa.major !== pb.major) {
		return "major";
	}
	if (pa.minor !== pb.minor) {
		return "minor";
	}
	if (pa.patch !== pb.patch) {
		return "patch";
	}
	if (pa.prerelease !== pb.prerelease) {
		return "prerelease";
	}
	return null;
}

export function isPatchLevelDiff(diff: VersionDiff): boolean {
	return diff === "patch" || diff === "prerelease";
}
