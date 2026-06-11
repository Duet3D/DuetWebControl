import { markRaw, defineComponent, h, type Component } from "vue";

import router from "@/router";
import { asRenderableComponent, findPageRecord } from "@/router/pages";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

/**
 * Options accepted by {@link registerLayout}. Several layouts may be registered at once; the user
 * picks the active one from the Settings combobox. The `id` is the stable handle for selection,
 * persistence (`settings.activeLayoutId`) and unregistration
 */
export interface RegisterLayoutOptions {
	/** Stable identifier - persisted in settings as the active selection and required for unregisterLayout() */
	id: string;

	/**
	 * Hide DWC's layout switch in Settings and cut off URL escape via a router guard that
	 * redirects non-overridden paths to `/`. At most one registered layout may be locked, and only
	 * when `registerLayout()` is called before `app.mount()`; later calls (or a second locked layout)
	 * are downgraded to unlocked with a warning. A locked layout must provide its own way back to the
	 * built-in shell (writing `useCustomLayout = false`)
	 */
	locked?: boolean;

	/**
	 * On first registration ever (settings.layoutUserSet === false) with no custom layout yet active,
	 * select this layout so the registered shell takes over without the user opting in. No-op once the
	 * user has made an explicit choice or another custom layout is already active
	 */
	takeoverOnFirstLoad?: boolean;

	/** Label shown in the Settings combobox / switch button. Defaults to the id */
	caption?: string;

	/**
	 * Optional per-path component overrides. Each key is a route path in vue-router's canonical
	 * form (e.g. `/Settings/:tab?`, not the file-syntax `/Settings/[[tab]]`); each value is the
	 * component to render at that path while THIS layout is the active custom layout.
	 *
	 * When this layout is the active one, the URL renders the supplied component; otherwise (the
	 * built-in shell or a different custom layout is active) the URL renders DWC's built-in
	 * component. Releasing the last override on a path restores its built-in component.
	 *
	 * Paths that don't match any registered route are skipped with a console.warn listing the
	 * available paths so the caller gets an actionable hint
	 */
	routes?: Record<string, Component>;
}

/** A registered layout: its shell component (stored via markRaw) plus the options it registered with */
export interface RegisteredLayout {
	component: Component;
	options: RegisterLayoutOptions;
}

// The layout registry (`registeredLayouts`) and its derived `activeLayout` / `activeLayoutOptions`
// live on the UI store (@/stores/ui) so external plugins can read them through window.DWC. This
// module mutates the registry through useUiStore() in registerLayout()/unregisterLayout()

/**
 * Layout-aware route overrides keyed by route record path. Each entry keeps the built-in component
 * plus the per-layout overrides; a single dispatcher component installed at the record renders the
 * active layout's override (or the built-in component when no active layout overrides the path).
 * Populated as layouts with `routes` register, torn down as they unregister
 */
interface RouteOverrideEntry {
	/** Pristine component the record held before any override; restored verbatim on teardown */
	original: Component;
	/** Render-ready built-in (lazy imports wrapped via asRenderableComponent) - the dispatcher fallback */
	builtin: Component;
	/** layoutId -> render-ready override component */
	byLayout: Map<string, Component>;
}
const _routeOverrides = new Map<string, RouteOverrideEntry>();

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

/** Whether the session-long locked-route guard has been installed yet (at most one locked layout) */
let _lockedGuardInstalled = false;

/**
 * Install the dispatcher at each override target. The first layout to override a given path snapshots
 * the built-in component and installs the dispatcher; later layers just add their component to that
 * path's per-layout map. Records that don't match an existing route path are skipped with a hint.
 * Triggers a router.replace so the currently-rendered page picks up a freshly added override without
 * waiting for the next navigation
 */
function installRouteOverrides(routes: Record<string, Component>, ownerId: string): void {
	let changed = false;
	for (const [path, customComp] of Object.entries(routes)) {
		const target = findPageRecord(path);
		if (!target) {
			const knownPaths = router.getRoutes()
				.filter((r) => r.meta.isLayout !== true)
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

		const recordPath = target.path;
		let entry = _routeOverrides.get(recordPath);
		if (!entry) {
			entry = { original: originalComp, builtin: markRaw(asRenderableComponent(originalComp)), byLayout: new Map() };
			_routeOverrides.set(recordPath, entry);

			// Dispatcher: renders the active layout's override for this path, falling back to the
			// built-in component when the active layout (if any) does not override it. Reads the
			// reactive `activeLayout`, so a layout switch re-renders without a remount
			const Dispatcher = defineComponent({
				name: "RouteOverrideDispatcher",
				setup() {
					const uiStore = useUiStore();
					return () => {
						const current = _routeOverrides.get(recordPath);
						if (!current) {
							return null;
						}
						const activeId = uiStore.activeLayout?.options.id;
						const override = activeId ? current.byLayout.get(activeId) : undefined;
						return h(override ?? current.builtin);
					};
				},
			});
			target.components!.default = markRaw(Dispatcher);
		}

		entry.byLayout.set(ownerId, markRaw(asRenderableComponent(customComp)));
		changed = true;
	}

	if (changed) {
		router.replace(router.currentRoute.value.fullPath).catch(() => { /* navigation aborts are fine */ });
	}
}

/**
 * Drop one layout's overrides. When a path loses its last override, the built-in component is
 * restored and the dispatcher removed. Triggers a router.replace so the active page reflects the
 * change immediately
 */
function uninstallRouteOverridesFor(ownerId: string): void {
	let changed = false;
	for (const [path, entry] of _routeOverrides) {
		if (!entry.byLayout.delete(ownerId)) {
			continue;
		}
		changed = true;
		if (entry.byLayout.size === 0) {
			const target = findPageRecord(path);
			if (target && target.components) {
				target.components.default = entry.original;
			}
			_routeOverrides.delete(path);
		}
	}

	if (changed) {
		router.replace(router.currentRoute.value.fullPath).catch(() => { /* navigation aborts are fine */ });
	}
}

/**
 * While a locked layout is active, any URL it has not explicitly overridden redirects to "/". This
 * prevents URL-escape to DWC's built-in pages while the locked layout owns the UI. The guard is
 * inert (returns true) whenever the active layout is not locked - i.e. when the built-in shell or an
 * unlocked custom layout is active - so it never needs tearing down. "/" is always allowed so the
 * redirect target itself never bounces; the override map should include "/" if DWC's Dashboard
 * shouldn't render there. Installed at most once, for the single permitted locked layout
 */
function installLockedRouteGuard(): void {
	if (_lockedGuardInstalled) {
		return;
	}
	_lockedGuardInstalled = true;
	router.beforeEach((to) => {
		const uiStore = useUiStore();
		if (!uiStore.activeLayoutOptions?.locked) {
			return true;
		}
		if (to.path === "/") {
			return true;
		}
		const activeId = uiStore.activeLayout?.options.id;
		if (activeId && to.matched.some((record) => _routeOverrides.get(record.path)?.byLayout.has(activeId))) {
			return true;
		}
		return { path: "/" };
	});
}

/**
 * Register a complete replacement shell. Several layouts may be registered simultaneously; the user
 * selects the active one from Settings. Throws only on a duplicate id - call {@link unregisterLayout}
 * first to replace an existing registration. Calls placed in `src/main.ts` between
 * `registerPlugins(app)` and `app.mount(...)` register before first paint and may additionally use
 * the pre-mount-only `locked` option
 *
 * @param component Full-shell component containing its own `<router-view>`. Stored via markRaw -
 *                  do not pass a reactive proxy
 * @param options   Registration options; see {@link RegisterLayoutOptions}
 * @throws Error when a layout with the same id is already registered
 */
export function registerLayout(component: Component, options: RegisterLayoutOptions): void {
	const uiStore = useUiStore();
	if (uiStore.registeredLayouts.some((layout) => layout.options.id === options.id)) {
		throw new Error(`Cannot register layout "${options.id}": a layout with this id is already registered. Call unregisterLayout("${options.id}") first.`);
	}

	// The lock cuts off URL escape via the route guard and is reserved for OEM shells wired into
	// src/main.ts pre-mount. Honour it only before app.mount() and only for the first locked layout;
	// otherwise downgrade to unlocked with a warning while the layout itself still registers
	const effectiveOptions: RegisterLayoutOptions = { ...options };
	if (effectiveOptions.locked) {
		if (_appMounted) {
			console.warn(`[DWC] Layout "${options.id}" requested locked: true but the app has already mounted; downgrading to unlocked. Locked layouts must register before app.mount()`);
			effectiveOptions.locked = false;
		} else if (uiStore.registeredLayouts.some((layout) => layout.options.locked)) {
			console.warn(`[DWC] Layout "${options.id}" requested locked: true but another locked layout is already registered; only one locked layout is allowed. Downgrading to unlocked`);
			effectiveOptions.locked = false;
		}
	}

	uiStore.registeredLayouts.push({ component: markRaw(component), options: effectiveOptions });

	if (effectiveOptions.routes) {
		installRouteOverrides(effectiveOptions.routes, effectiveOptions.id);
	}

	if (effectiveOptions.locked) {
		installLockedRouteGuard();
	}

	if (effectiveOptions.takeoverOnFirstLoad) {
		const settings = useSettingsStore();
		if (!settings.layoutUserSet && !settings.useCustomLayout) {
			settings.useCustomLayout = true;
			settings.activeLayoutId = effectiveOptions.id;
		}
	}
}

/**
 * Release a registered layout. No-op when no layout with the passed id is registered - a plugin
 * cannot unregister another plugin's layout. Any route overrides it installed are dropped (the
 * built-in component is restored where this was the last override). When the released layout was the
 * active selection, the selection is cleared so the switcher falls back to the first remaining layout
 * or the built-in shell.
 *
 * Locked layouts cannot be unregistered: the lock keeps the user in the registered shell for the
 * lifetime of the session, and allowing unregister would undo that contract
 *
 * @throws Error when the named layout is locked
 */
export function unregisterLayout(id: string): void {
	const uiStore = useUiStore();
	const idx = uiStore.registeredLayouts.findIndex((layout) => layout.options.id === id);
	if (idx === -1) {
		return;
	}
	if (uiStore.registeredLayouts[idx].options.locked) {
		throw new Error(`Cannot unregister layout "${id}": the layout is locked and must remain active for the session`);
	}

	uninstallRouteOverridesFor(id);
	uiStore.registeredLayouts.splice(idx, 1);

	const settings = useSettingsStore();
	if (settings.activeLayoutId === id) {
		settings.activeLayoutId = null;
	}
}
