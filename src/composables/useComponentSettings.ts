import type { InjectionKey, WritableComputedRef } from "vue";

import { registeredLayout } from "@/plugins/layout";
import { useSettingsStore } from "@/stores/settings";

/**
 * Kind of a dynamic component setting - selects which object-model entities the settings dialog
 * enumerates and how it renders the visibility list for that field
 */
export type ComponentSettingKind =
	"axes" | "extruders" | "tools" | "beds" | "chambers" | "probes"
	| "fans" | "tachoFans" | "heaters" | "extraSensors";

/**
 * Describes one dynamic (entity-visibility) field of a component's settings. The settings dialog
 * renders these automatically; static fields are left to the component's own dialog slot
 */
export interface ComponentSettingDescriptor {
	/**
	 * Entity kind backing this field
	 */
	kind: ComponentSettingKind;

	/**
	 * Already-translated section label shown above the entity list
	 */
	label: string;
}

/**
 * Handle a component provides to its descendants (e.g. {@link PanelCard}) so they can open an
 * editor for this component's settings: the resolved identity plus the dynamic-field schema
 */
export interface ComponentSettingsHandle {
	id: string;
	schema: Record<string, ComponentSettingDescriptor>;
}

/**
 * Injection key carrying the {@link ComponentSettingsHandle} from a component down to descendants
 */
export const COMPONENT_SETTINGS_KEY: InjectionKey<ComponentSettingsHandle> = Symbol("dwc-component-settings");

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

	/**
	 * Dynamic-field schema. Each entry names a field of {@link defaults} that holds an entity-visibility
	 * overlay (`Array<number> | null`) and describes how the settings dialog should render it. Provided
	 * to descendants via {@link COMPONENT_SETTINGS_KEY}; never persisted
	 */
	schema?: Partial<Record<keyof T, ComponentSettingDescriptor>>;
}

/**
 * Per-parent settings scope. The parent provides this so its descendants can derive a stable positional id:
 * `segments` accumulates the path from the page root, `childCounter` is the running counter used to give
 * sibling instances of the same component name distinct indices
 */
export interface SettingsScope {
	segments: Array<string>;
	childCounter: Record<string, number>;
}

/**
 * Injection key for the settings scope. A custom-layout plugin can `provide` this to stamp a stable
 * identity onto a placed widget subtree, so the components it renders derive their settings ids from
 * the layout-assigned path instead of the route-based default
 */
export const SETTINGS_SCOPE_KEY: InjectionKey<SettingsScope> = Symbol("dwc-component-settings-scope");

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
	const settingsStore = useSettingsStore();

	// Built-in layout: the page/route is the layout, so identity is route + component name. Two
	// instances of the same component on the same route share settings; pin `options.id` to
	// avoid that. No scope is provided to descendants because there is no layout chain to extend.
	// Reads the *effective* state - useCustomLayout may be true while the plugin is still loading,
	// during which window the built-in shell renders and route-based ids are the right derivation
	if (!settingsStore.useCustomLayout || !registeredLayout.value) {
		return `${route.path}::${componentName}`;
	}

	// Dynamic (custom) layout: positional path through the inject/provide chain so siblings
	// get distinct ids even when component names collide and the user-arranged hierarchy is what
	// disambiguates them
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

	provide(COMPONENT_SETTINGS_KEY, {
		id,
		schema: (options?.schema ?? {}) as Record<string, ComponentSettingDescriptor>
	});

	return computed<T>({
		get: () => settingsStore.componentSettings[id].data as T,
		set: (value: T) => {
			settingsStore.componentSettings[id].data = value;
		}
	});
}
