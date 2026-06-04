/**
 * router/pages.ts
 *
 * Helpers for resolving the page component behind a route path, hiding the
 * setupLayouts record convention from callers (the custom-layout override
 * machinery and the public plugin API both need it).
 */

import { defineAsyncComponent, type Component } from "vue";
import type { RouteRecordNormalized } from "vue-router";

import router from "@/router";

/**
 * A route component is either a resolved component object or a lazy import loader
 * (`() => import("./Page.vue")`) for a code-split page. Rendering a loader with h() would invoke it
 * as a functional component and render the returned Promise as "[object Promise]", so wrap loaders
 * in defineAsyncComponent. Route components are never plain functional components, so treating every
 * function as a loader is safe.
 */
export function asRenderableComponent(component: Component): Component {
	return typeof component === "function"
		? defineAsyncComponent(component as () => Promise<Component>)
		: component;
}

/**
 * Find the route record that renders the page at `path`. setupLayouts produces two flattened records
 * per file-based route: the parent (marked `meta.isLayout = true`, component = the layout switcher)
 * and the child (component = the actual page). This returns the child, so callers mutate or read the
 * real page rather than the layout-switcher parent.
 */
export function findPageRecord(path: string): RouteRecordNormalized | undefined {
	return router.getRoutes().find((r) => r.path === path && r.meta.isLayout !== true);
}

/**
 * Resolve the renderable page component registered at `path` (e.g. `/Plugins/HeightMap`), or
 * undefined when no route matches. Intended for embedding one registered page inside another -
 * `<component :is="getPageComponent('/Plugins/HeightMap')" />` - rather than navigation. Embedding
 * renders only the page component: vue-router guards, scroll handling and `meta` do not apply, since
 * no navigation takes place.
 */
export function getPageComponent(path: string): Component | undefined {
	const component = findPageRecord(path)?.components?.default;
	return component ? asRenderableComponent(component) : undefined;
}
