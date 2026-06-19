import type { WritableComputedRef } from "vue";

import { resolveComponentId } from "@/composables/useComponentSettings";
import { useCacheStore } from "@/stores/cache";

/**
 * Options accepted by {@link useComponentCache}
 */
export interface ComponentCacheOptions<T> {
	/**
	 * Stable component identity. Overrides the derived positional path - use this when the cached state must
	 * follow a component instance that the layout system can move around. When omitted (the common case) the
	 * id is derived from `route.path` plus the component's place in the inject/provide chain, so two instances
	 * of the same component in a custom layout keep separate cache records
	 */
	id?: string;

	/**
	 * Current schema version. Bump it whenever the shape of {@link defaults} changes incompatibly so the
	 * persisted record can either be upgraded via {@link upgrade} or fall back to the new defaults
	 */
	schemaVersion?: number;

	/**
	 * Migration handler receiving the previously-persisted value (any shape, possibly from an older version)
	 * and returning a value matching the current shape. Must be total - return the defaults on failure
	 * rather than throwing
	 */
	upgrade?: (old: unknown) => T;
}

/**
 * Reactive, persisted per-component cache - the transient-state counterpart to {@link useComponentSettings}.
 * Use it for UI state that should survive navigation and sessions but isn't a user-facing setting (e.g. the
 * last selected tab of a panel). Returns a writable computed ref - assigning to `.value` replaces the whole
 * payload, mutating nested fields works through Pinia's reactivity. Shares its identity with the component's
 * settings, so both resolve to the same id
 *
 * @param defaults Initial shape. Must be JSON-serialisable (the persistence layer roundtrips through JSON)
 * @param options See {@link ComponentCacheOptions}
 */
export function useComponentCache<T>(defaults: T, options?: ComponentCacheOptions<T>): WritableComputedRef<T> {
	const cacheStore = useCacheStore();
	const id = resolveComponentId(options?.id);
	const schemaVersion = options?.schemaVersion ?? 1;

	cacheStore.getOrInitComponentCache(id, defaults, schemaVersion, options?.upgrade);

	return computed<T>({
		get: () => cacheStore.componentCache[id].data as T,
		set: (value: T) => {
			cacheStore.componentCache[id].data = value;
		}
	});
}
