/**
 * Three-way merge of remote changes against a baseline onto a local snapshot.
 *
 * `baseline` is the blob this session last loaded or successfully wrote. `remote` is the file as
 * it currently sits on the board. `local` is the in-memory state this session is about to upload.
 *
 * Per key:
 *   - baseline == remote: no remote edit, keep local.
 *   - baseline == local:  no local edit, adopt remote.
 *   - both differ:        conflict - keep local, record the path so the caller can notify.
 *
 * Plain nested objects recurse so two tabs editing disjoint nested keys don't clobber each other.
 * Paths listed in `unionArrayPaths` get set-delta merge (additions and removals from each side
 * are applied) - useful for fields like `enabledPlugins` where pure last-writer would
 * silently undo the other session's toggle
 */

const PLAIN_OBJECT_PROTO = Object.prototype;

export type Path = ReadonlyArray<string>;

export interface MergeResult {
	/** Merged value (a fresh plain-object tree, safe to mutate or upload) */
	merged: any;
	/** True if `merged` differs from `local` (i.e. remote-only edits were adopted) */
	changed: boolean;
	/** Dotted paths where both local and remote changed the same key since baseline */
	conflicts: Array<string>;
}

export interface MergeOptions {
	/** Dotted paths to merge as a set (additions and removals from each side) */
	unionArrayPaths?: ReadonlySet<string>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const proto = Object.getPrototypeOf(value);
	return proto === PLAIN_OBJECT_PROTO || proto === null;
}

function cloneJson<T>(value: T): T {
	return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) {
		return true;
	}
	if (typeof a !== typeof b || a === null || b === null) {
		return false;
	}
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) {
			return false;
		}
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) {
				return false;
			}
		}
		return true;
	}
	if (typeof a === "object") {
		if (typeof b !== "object" || Array.isArray(b)) {
			return false;
		}
		const aKeys = Object.keys(a as object);
		const bKeys = Object.keys(b as object);
		if (aKeys.length !== bKeys.length) {
			return false;
		}
		for (const key of aKeys) {
			if (!Object.prototype.hasOwnProperty.call(b, key)) {
				return false;
			}
			if (!deepEqual((a as any)[key], (b as any)[key])) {
				return false;
			}
		}
		return true;
	}
	return false;
}

function joinPath(path: Path, key: string): string {
	return path.length === 0 ? key : `${path.join(".")}.${key}`;
}

// Set-delta merge: keep additions from each side, drop removals from each side. baseline acts
// as the common ancestor so deletions are recognized rather than reverted by the other side's
// unchanged copy
function mergeSet(baseline: unknown, remote: unknown, local: unknown): Array<unknown> {
	const baselineArr = Array.isArray(baseline) ? baseline : [];
	const remoteArr = Array.isArray(remote) ? remote : baselineArr;
	const localArr = Array.isArray(local) ? local : baselineArr;

	const baselineSet = new Set(baselineArr);
	const remoteSet = new Set(remoteArr);
	const localSet = new Set(localArr);

	const result = new Set<unknown>([...remoteArr, ...localArr]);
	for (const item of baselineSet) {
		// Removed by either side relative to baseline
		if (!remoteSet.has(item) || !localSet.has(item)) {
			if (!remoteSet.has(item)) {
				result.delete(item);
			}
			if (!localSet.has(item)) {
				result.delete(item);
			}
		}
	}
	return [...result];
}

function mergeRecursive(local: any, baseline: any, remote: any, path: Path, options: MergeOptions, conflicts: Array<string>): { merged: any; changed: boolean } {
	if (!isPlainObject(remote)) {
		// Remote is a scalar / array / null at this level - fall through to scalar handling
		if (deepEqual(local, remote)) {
			return { merged: cloneJson(local), changed: false };
		}
		if (deepEqual(baseline, remote)) {
			// Only local changed - keep local
			return { merged: cloneJson(local), changed: false };
		}
		if (deepEqual(baseline, local)) {
			// Only remote changed - adopt remote
			return { merged: cloneJson(remote), changed: true };
		}
		// Both changed - keep local, record conflict
		conflicts.push(path.join(".") || "<root>");
		return { merged: cloneJson(local), changed: false };
	}

	const merged: Record<string, unknown> = isPlainObject(local) ? { ...local } : {};
	const baselineObj = isPlainObject(baseline) ? baseline : {};
	const localObj = isPlainObject(local) ? local : {};
	let changed = false;

	const keys = new Set<string>([...Object.keys(remote), ...Object.keys(baselineObj), ...Object.keys(localObj)]);

	for (const key of keys) {
		const childPath: Path = [...path, key];
		const dottedPath = joinPath(path, key);
		const hasRemote = Object.prototype.hasOwnProperty.call(remote, key);
		const hasBaseline = Object.prototype.hasOwnProperty.call(baselineObj, key);
		const hasLocal = Object.prototype.hasOwnProperty.call(localObj, key);

		const remoteVal = hasRemote ? (remote as any)[key] : undefined;
		const baselineVal = hasBaseline ? (baselineObj as any)[key] : undefined;
		const localVal = hasLocal ? (localObj as any)[key] : undefined;

		// Union-array merge for explicitly opted-in paths
		if (options.unionArrayPaths?.has(dottedPath) && (Array.isArray(remoteVal) || Array.isArray(baselineVal) || Array.isArray(localVal))) {
			const unionResult = mergeSet(baselineVal, remoteVal, localVal);
			merged[key] = unionResult;
			if (!deepEqual(unionResult, localVal)) {
				changed = true;
			}
			continue;
		}

		// Remote silent on this key
		if (!hasRemote) {
			if (hasBaseline && !hasLocal) {
				// Both removed the key (or it was never reintroduced locally) - nothing to do
				continue;
			}
			if (hasBaseline && hasLocal && deepEqual(baselineVal, localVal)) {
				// Remote deleted, local untouched -> adopt deletion
				delete merged[key];
				changed = true;
				continue;
			}
			if (hasBaseline && hasLocal) {
				// Remote deleted; local modified -> conflict, keep local
				conflicts.push(dottedPath);
				continue;
			}
			// Key only exists locally (local addition) - keep it
			continue;
		}

		// Both sides have a plain-object value - recurse so disjoint nested keys don't fight
		if (isPlainObject(remoteVal) && (isPlainObject(baselineVal) || !hasBaseline) && isPlainObject(localVal)) {
			const nested = mergeRecursive(localVal, baselineVal, remoteVal, childPath, options, conflicts);
			merged[key] = nested.merged;
			if (nested.changed) {
				changed = true;
			}
			continue;
		}

		// Scalar / array / type-shift at this leaf
		if (deepEqual(localVal, remoteVal)) {
			continue;
		}
		if (hasBaseline && deepEqual(baselineVal, remoteVal)) {
			// Only local changed - keep local
			continue;
		}
		if (!hasLocal || (hasBaseline && deepEqual(baselineVal, localVal))) {
			// Only remote changed - adopt remote
			merged[key] = cloneJson(remoteVal);
			changed = true;
			continue;
		}
		// Both changed - keep local, record conflict
		conflicts.push(dottedPath);
	}

	return { merged, changed };
}

/**
 * Compute a three-way merge of `local` and `remote` against the common `baseline`.
 * Returns the merged blob along with whether any remote edits were adopted and which paths
 * required a conflict decision (both sides edited the same scalar / array)
 */
export function threeWayMerge(local: any, baseline: any, remote: any, options: MergeOptions = {}): MergeResult {
	const conflicts: Array<string> = [];
	const { merged, changed } = mergeRecursive(local, baseline, remote, [], options, conflicts);
	return { merged, changed, conflicts };
}

/**
 * Deep-clone a JSON-compatible value. Useful for snapshotting reactive state before/after a
 * save so subsequent merges have a stable common ancestor
 */
export function snapshot<T>(value: T): T {
	return cloneJson(value);
}
