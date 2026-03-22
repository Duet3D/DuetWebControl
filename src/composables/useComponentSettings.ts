import type { InjectionKey, WritableComputedRef } from "vue";

import { useSettingsStore } from "@/stores/settings";

/**
 * Options accepted by {@link useComponentSettings}
 */
export interface ComponentSettingsOptions<T> {
	/**
	 * Stable component identity. Overrides the derived positional path - use this when settings must follow a
	 * component instance that the layout system can move around (a dragged dashboard tile, a stable widget id).
	 * When omitted (the common case) the id is derived from `route.path` plus the component's place in the
	 * inject/provide chain
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
 * Per-parent settings scope. The parent provides this so its descendants can derive a stable positional id:
 * `segments` accumulates the path from the page root, `childCounter` is the running counter used to give
 * sibling instances of the same component name distinct indices
 */
interface SettingsScope {
	segments: Array<string>;
	childCounter: Record<string, number>;
}

const SETTINGS_SCOPE_KEY: InjectionKey<SettingsScope> = Symbol("dwc-component-settings-scope");

function deriveComponentName(): string {
	const instance = getCurrentInstance();
	if (!instance) {
		throw new Error("useComponentSettings must be called inside setup()");
	}
	const type = instance.type as { __name?: string; name?: string };
	return type.__name ?? type.name ?? "Anonymous";
}

function derivePositionalId(): string {
	const route = useRoute();
	const componentName = deriveComponentName();

	const parent = inject(SETTINGS_SCOPE_KEY, undefined);
	const parentSegments = parent?.segments ?? [];
	const parentCounter = parent?.childCounter ?? {};

	// Bump the parent's counter so multiple sibling instances of the same component get distinct indices
	const siblingIndex = parentCounter[componentName] ?? 0;
	parentCounter[componentName] = siblingIndex + 1;

	const ownSegment = (siblingIndex === 0) ? componentName : `${componentName}#${siblingIndex}`;
	const ownSegments = [...parentSegments, ownSegment];

	// Provide a fresh scope to descendants so they extend the path under this component, not under its parent
	provide(SETTINGS_SCOPE_KEY, {
		segments: ownSegments,
		childCounter: {}
	});

	return `${route.path}::${ownSegments.join("::")}`;
}

/**
 * Reactive, persisted per-component settings. Returns a writable computed ref - assigning to `.value`
 * replaces the whole payload, mutating nested fields works through Pinia's reactivity. Identity defaults
 * to a derived positional path; pass `options.id` to pin it to a stable key
 *
 * @example
 * ```ts
 * const settings = useComponentSettings({ sortNewestFirst: true });
 * // read:   settings.value.sortNewestFirst
 * // write:  settings.value.sortNewestFirst = false
 * // replace: settings.value = { sortNewestFirst: false };
 * ```
 *
 * @param defaults Initial shape. Must be JSON-serialisable (the persistence layer roundtrips through JSON)
 * @param options See {@link ComponentSettingsOptions}
 */
export function useComponentSettings<T>(defaults: T, options?: ComponentSettingsOptions<T>): WritableComputedRef<T> {
	const settingsStore = useSettingsStore();
	const id = options?.id ?? derivePositionalId();
	const schemaVersion = options?.schemaVersion ?? 1;

	settingsStore.getOrInitComponentSetting(id, defaults, schemaVersion, options?.upgrade);

	return computed<T>({
		get: () => settingsStore.componentSettings[id].data as T,
		set: (value: T) => {
			settingsStore.componentSettings[id].data = value;
		}
	});
}
