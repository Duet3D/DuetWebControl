import { ref, shallowRef, markRaw, defineComponent, h, type Component, type Ref, type ShallowRef } from "vue";

import router from "@/router";
import { useSettingsStore } from "@/stores/settings";

/**
 * Options accepted by {@link registerLayout}. Single-slot semantics are enforced at the API -
 * a second registration without a prior {@link unregisterLayout} is refused. The `id` is used
 * solely as a stable handle for unregistration; it is not persisted in settings and not part
 * of the layout-selection resolution
 */
export interface RegisterLayoutOptions {
	/** Stable identifier - required for unregisterLayout(). Not persisted */
	id: string;

	/**
	 * Hide DWC's layout switch in Settings and cut off URL escape via a router guard that
	 * redirects non-overridden paths to `/`. Honoured only when `registerLayout()` is called
	 * before `app.mount()`; later calls are downgraded to unlocked with a warning. The registering
	 * code is expected to provide its own escape mechanism (writing `useCustomLayout = false`)
	 */
	locked?: boolean;

	/**
	 * On first registration ever (settings.layoutUserSet === false), set settings.useCustomLayout
	 * to true so the registered shell takes over without the user opting in. No-op once the user
	 * has clicked the Settings button
	 */
	takeoverOnFirstLoad?: boolean;

	/** Label shown in the Settings button ("Switch to <caption>"). Defaults to the id */
	caption?: string;

	/**
	 * Optional per-path component overrides. Each key is a route path in vue-router's canonical
	 * form (e.g. `/Settings/:tab?`, not the file-syntax `/Settings/[[tab]]`); each value is the
	 * component to render at that path while THIS layout is the active custom layout.
	 *
	 * When `useCustomLayout` is true and this layout is registered, the URL renders the supplied
	 * component; when `useCustomLayout` is false (or another layout is registered), the URL renders
	 * DWC's built-in component. `unregisterLayout()` restores all originals.
	 *
	 * Paths that don't match any registered route are skipped with a console.warn listing the
	 * available paths so the caller gets an actionable hint
	 */
	routes?: Record<string, Component>;
}

/**
 * The currently registered custom layout component, or null when no layout is registered.
 * Read by the switcher in `src/layouts/default.vue` to decide which shell to render
 */
export const registeredLayout: ShallowRef<Component | null> = shallowRef(null);

/**
 * Options carried by the currently registered layout. Mirror of the second argument to
 * {@link registerLayout}; null when no layout is registered. Read by the switcher and the
 * Settings page to drive button label + lock-gating
 */
export const registeredLayoutOptions: Ref<RegisterLayoutOptions | null> = ref(null);

/**
 * Snapshot of original route components, keyed by path. Populated when a layout with `routes`
 * registers; consumed when it unregisters so the routes go back to their built-in components
 */
const _routeOverrideSnapshots = new Map<string, Component>();

/**
 * Tracks whether the app has finished mounting. Flipped by App.vue's onMounted hook. Read by
 * {@link registerLayout} to downgrade `locked: true` to unlocked when called post-mount - the
 * lock cuts off URL escape (see {@link installLockedRouteGuard}) and that level of UI takeover
 * is restricted to callers wiring registerLayout into src/main.ts before app.mount()
 */
let _appMounted = false;

/** Internal: flipped by App.vue's onMounted hook. Not part of the public API */
export function _markAppMounted(): void {
	_appMounted = true;
}

/**
 * The router.beforeEach cleanup function returned at lock-guard install time. Called by
 * {@link uninstallLockedRouteGuard} when the locked layout unregisters
 */
let _lockedGuardRemove: (() => void) | null = null;

/** Set of route record paths the active layout has overridden. Used by the lock guard for matching */
const _overriddenRoutePaths = new Set<string>();

/**
 * Install the layout-aware wrapper at each override target. Records that don't match an existing
 * route path are skipped with a hint. Triggers a router.replace so the currently-rendered page
 * picks up the new component without waiting for the next navigation
 */
function installRouteOverrides(routes: Record<string, Component>, ownerId: string): void {
	const allRecords = router.getRoutes();

	for (const [path, customComp] of Object.entries(routes)) {
		// setupLayouts produces two flattened records per file-based route: the parent (marked
		// meta.isLayout = true, component = the layout switcher) and the child (component = the
		// actual page). We want to swap the child's component, not the layout-switcher parent
		const target = allRecords.find((r) => r.path === path && r.meta?.isLayout !== true);
		if (!target) {
			const knownPaths = allRecords
				.filter((r) => r.meta?.isLayout !== true)
				.map((r) => r.path)
				.sort();
			console.warn(`[DWC] Cannot override route "${path}": no registered route matches that path. Available paths: ${knownPaths.join(", ")}`);
			continue;
		}

		const originalComp = target.components?.default;
		if (!originalComp) {
			console.warn(`[DWC] Cannot override route "${path}": existing record has no default component`);
			continue;
		}

		_routeOverrideSnapshots.set(path, originalComp);
		_overriddenRoutePaths.add(target.path);

		const rawCustom = markRaw(customComp);
		const rawBuiltin = markRaw(originalComp);

		// Layout-aware wrapper: renders the custom component only while THIS layout is the
		// registered one AND the user has the custom layout active. The owner check guards
		// against a second layout somehow taking ownership of the slot (single-slot enforcement
		// at the API makes that path unreachable today, but the predicate keeps the wrapper honest)
		const Wrapper = defineComponent({
			name: "RouteOverrideWrapper",
			setup() {
				const settings = useSettingsStore();
				return () => h(
					settings.useCustomLayout && registeredLayoutOptions.value?.id === ownerId
						? rawCustom
						: rawBuiltin
				);
			},
		});

		target.components!.default = markRaw(Wrapper);
	}

	// Force the active route to re-resolve so the swap is visible immediately
	router.replace(router.currentRoute.value.fullPath).catch(() => { /* navigation aborts are fine */ });
}

/**
 * Restore the original component at each previously-overridden route. Triggers a router.replace
 * so the active page remounts under the built-in component
 */
function uninstallRouteOverrides(): void {
	if (_routeOverrideSnapshots.size === 0) {
		return;
	}

	const allRecords = router.getRoutes();
	for (const [path, original] of _routeOverrideSnapshots) {
		const target = allRecords.find((r) => r.path === path && r.meta?.isLayout !== true);
		if (target && target.components) {
			target.components.default = original;
		}
	}
	_routeOverrideSnapshots.clear();
	_overriddenRoutePaths.clear();

	router.replace(router.currentRoute.value.fullPath).catch(() => { /* navigation aborts are fine */ });
}

/**
 * When a locked layout is active (useCustomLayout=true), any URL the layout has not explicitly
 * overridden redirects to "/". This prevents URL-escape to DWC's built-in pages while the locked
 * layout is meant to own the UI. The guard self-disables when:
 *
 *  - the layout unregisters (cleanup function torn down by {@link uninstallLockedRouteGuard})
 *  - the registering code clears the lock by setting `useCustomLayout = false` - non-overridden
 *    routes are reachable again, restoring full DWC behaviour
 *  - the user is navigating to "/", which is always allowed so the redirect target itself never
 *    bounces. The override map should include "/" if DWC's Dashboard shouldn't render there
 */
function installLockedRouteGuard(): void {
	_lockedGuardRemove = router.beforeEach((to) => {
		if (!registeredLayoutOptions.value?.locked) {
			return true;
		}
		if (!useSettingsStore().useCustomLayout) {
			return true;
		}
		if (to.path === "/") {
			return true;
		}
		if (to.matched.some((record) => _overriddenRoutePaths.has(record.path))) {
			return true;
		}
		return { path: "/" };
	});
}

function uninstallLockedRouteGuard(): void {
	if (_lockedGuardRemove) {
		_lockedGuardRemove();
		_lockedGuardRemove = null;
	}
}

/**
 * Register a complete replacement shell. Single-slot: throws when another layout is already
 * registered; callers must {@link unregisterLayout} first if they need to swap. Call from a
 * plugin's init code; calls placed in `src/main.ts` between `registerPlugins(app)` and
 * `app.mount(...)` register before first paint and additionally unlock the pre-mount-only options
 *
 * @param component Full-shell component containing its own `<router-view>`. Stored via markRaw -
 *                  do not pass a reactive proxy
 * @param options   Registration options; see {@link RegisterLayoutOptions}
 * @throws Error when a custom layout is already registered
 */
export function registerLayout(component: Component, options: RegisterLayoutOptions): void {
	if (registeredLayoutOptions.value) {
		throw new Error(`Cannot register layout "${options.id}": layout "${registeredLayoutOptions.value.id}" is already registered. Call unregisterLayout("${registeredLayoutOptions.value.id}") first.`);
	}

	// Locked layouts cut off URL escape via the route guard. Honoured only when registerLayout is
	// called before app.mount() (i.e. from src/main.ts pre-mount); post-mount calls are downgraded
	// to unlocked with a warning, while the layout itself still registers
	const effectiveOptions: RegisterLayoutOptions = { ...options };
	if (effectiveOptions.locked && _appMounted) {
		console.warn(`[DWC] Layout "${options.id}" requested locked: true but the app has already mounted; downgrading to unlocked. Locked layouts must register before app.mount()`);
		effectiveOptions.locked = false;
	}

	registeredLayout.value = markRaw(component);
	registeredLayoutOptions.value = effectiveOptions;

	if (effectiveOptions.routes) {
		installRouteOverrides(effectiveOptions.routes, effectiveOptions.id);
	}

	if (effectiveOptions.locked) {
		installLockedRouteGuard();
	}

	if (effectiveOptions.takeoverOnFirstLoad) {
		const settings = useSettingsStore();
		if (!settings.layoutUserSet) {
			settings.useCustomLayout = true;
		}
	}
}

/**
 * Release the registered layout. No-op when the passed id does not match the current registration -
 * a plugin cannot unregister another plugin's layout. The switcher swaps back to the static shell
 * on the next render; any installed route overrides are restored to their built-in components.
 *
 * Locked layouts cannot be unregistered: the lock is intended to keep the user in the registered
 * shell for the lifetime of the session, and allowing unregister would undo that contract
 *
 * @throws Error when the registered layout is locked
 */
export function unregisterLayout(id: string): void {
	if (registeredLayoutOptions.value?.id !== id) {
		return;
	}
	if (registeredLayoutOptions.value.locked) {
		throw new Error(`Cannot unregister layout "${id}": the layout is locked and must remain active for the session`);
	}
	uninstallLockedRouteGuard();
	uninstallRouteOverrides();
	registeredLayout.value = null;
	registeredLayoutOptions.value = null;
}
