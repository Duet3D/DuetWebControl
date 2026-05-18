/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { setupLayouts } from "virtual:generated-layouts";
import { routes, handleHotUpdate } from "vue-router/auto-routes";

// unplugin-vue-router translates `[[...path]]` segments to `:path(.*)?`, a single optional
// string with a `.*` regex. That isn't actually a repeatable catch-all - vue-router percent-
// encodes the slashes in the captured string (producing /foo%2Fbar URLs) and also can't accept
// an array of segments at push time. Rewrite recursively to `:path*` so the built-in segment-
// aware regex kicks in, vue-router URL-encodes each segment independently, and the param
// round-trips as a string[] everywhere we touch it. Applies to every route that catch-alls a
// path - Explorer and Jobs both rely on this
function fixCatchAllPath(routesIn: Array<RouteRecordRaw>) {
	for (const route of routesIn) {
		if (typeof route.path === "string" && route.path.includes(":path(.*)?")) {
			route.path = route.path.replace(":path(.*)?", ":path*");
		}
		if (Array.isArray(route.children)) {
			fixCatchAllPath(route.children as Array<RouteRecordRaw>);
		}
	}
}

const compiledRoutes = setupLayouts([...routes] as RouteRecordRaw[]);
fixCatchAllPath(compiledRoutes);

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: compiledRoutes,
	// Scroll handling:
	// - back/forward: restore the previous scroll position (one frame later so lazy-loaded
	//   route chunks have rendered first)
	// - `#hash` link: smooth-scroll to the anchor
	// - same top-level route (e.g. navigating between Explorer subdirectories): keep the
	//   current scroll position so a click on a folder row doesn't jump the page to top
	// - otherwise (cross-page navigation): scroll to top
	scrollBehavior(to, from, savedPosition) {
		if (savedPosition) {
			return new Promise((resolve) => {
				requestAnimationFrame(() => resolve(savedPosition));
			});
		}
		if (to.hash) {
			return { el: to.hash, behavior: "smooth" };
		}
		const sameRoute = to.matched[0]?.path && to.matched[0]?.path === from.matched[0]?.path;
		if (sameRoute) {
			return false;
		}
		return { top: 0 };
	},
});

if (import.meta.hot) {
	handleHotUpdate(router);
}

// When a lazily-imported chunk fails to load - typically because the app was
// redeployed and the old hashed chunks are gone - reload once to pick up the new
// build. Vite fires `vite:preloadError` for exactly this case. The timestamp guard
// throttles back-to-back reloads (so an in-session network blip can't put us in a
// reload loop) while still allowing a real redeploy minutes later to trigger a fresh reload
const RELOAD_THROTTLE_MS = 60_000;
window.addEventListener("vite:preloadError", (event) => {
	console.warn("Chunk preload failed", event);
	const last = Number(sessionStorage.getItem("dwc:preload-reloaded-at") ?? 0);
	if (Date.now() - last < RELOAD_THROTTLE_MS) {
		return;
	}
	sessionStorage.setItem("dwc:preload-reloaded-at", String(Date.now()));
	window.location.reload();
});

export default router
