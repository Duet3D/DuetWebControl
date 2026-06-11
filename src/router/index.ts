/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { setupLayouts } from "virtual:generated-layouts";
import { routes, handleHotUpdate } from "vue-router/auto-routes";

import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import vuetify from "@/vue-plugins/vuetify";

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

// Legacy redirects: the four separate Files pages were folded into the unified Explorer
// (Filaments/System/Macros are folders under volume 0) plus the standalone Jobs page.
// Keep old bookmarks and externally linked URLs working
compiledRoutes.push(
	{ path: "/Files/Filaments", redirect: "/Explorer/filaments" },
	{ path: "/Files/System", redirect: "/Explorer/sys" },
	{ path: "/Files/Jobs", redirect: "/Jobs" },
	{ path: "/Files/Macros", redirect: "/Explorer/macros" },
);

// Escape hatch back to the built-in shell. The switch runs in a navigation guard rather
// than a page component's onMounted, so it fires during route resolution no matter which shell is
// currently mounted - a third-party custom layout does not have to render this route through its
// own <router-view> for the escape to work, and it is unaffected by deferred plugin loading.
// A locked layout owns the UI for the session and must supply its own escape, so the switch is
// refused while one is active; the layout's own beforeEach guard also redirects this path to "/"
compiledRoutes.push({
	path: "/BuiltInLayout",
	component: { render: () => null },
	beforeEnter: () => {
		const settings = useSettingsStore();
		if (useUiStore().activeLayoutOptions?.locked) {
			return { path: "/" };
		}
		settings.useCustomLayout = false;
		settings.activeLayoutId = null;
		settings.layoutUserSet = true;
		return { path: "/" };
	},
});

// Set by the beforeEach guard from the scroll position of the page being left, consumed by
// scrollBehavior - true when that page was scrolled to (or past) its bottom edge
let leftPageAtBottom = false;

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: compiledRoutes,
	// Scroll handling:
	// - back/forward: restore the previous scroll position (one frame later so lazy-loaded
	//   route chunks have rendered first)
	// - `#hash` link: smooth-scroll to the anchor
	// - same top-level route (e.g. navigating between Explorer subdirectories): keep the
	//   current scroll position so a click on a folder row doesn't jump the page to top
	// - cross-page navigation from a page scrolled to its bottom (md+): open the next page
	//   at its bottom too, but only when the destination is a viewport-filling page
	//   (`meta.pageFill`) - landing at the bottom of a regular flowing page would be disorienting
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
		if (leftPageAtBottom && vuetify.display.mdAndUp.value && to.meta.pageFill === true) {
			return { top: document.documentElement.scrollHeight };
		}
		return { top: 0 };
	},
});

// Capture whether the page being left was scrolled to its bottom edge. Read here, before the
// route component swaps, so window.scrollY still reflects the outgoing page
router.beforeEach(() => {
	const scrollable = document.documentElement.scrollHeight - window.innerHeight;
	leftPageAtBottom = scrollable > 4 && window.scrollY >= scrollable - 4;
});

// Scroll the page to its bottom edge so a viewport-filling panel (the G-code viewer, the height
// map, the file editor) opens flush with the status row scrolled off the top. The destination's
// content settles asynchronously - a canvas sized on a debounce, the status row reflowing live -
// so the document keeps growing after the first scroll. The scroll is repeated over the first
// second to chase the growing bottom; the first pass animates, the catch-up passes jump
// instantly so they don't queue competing smooth animations. A no-op below md, where the
// stacked layout has no status row to scroll past, and when the user disabled it
export function scrollPageToBottom() {
	if (!useSettingsStore().behaviour.autoScroll || !vuetify.display.mdAndUp.value) {
		return;
	}
	const scrollToEnd = (smooth: boolean) => {
		window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? "smooth" : "auto" });
	};
	requestAnimationFrame(() => scrollToEnd(true));
	setTimeout(() => scrollToEnd(false), 300);
	setTimeout(() => scrollToEnd(false), 700);
	setTimeout(() => scrollToEnd(false), 1100);
}

// Pages flagged `meta.scrollToBottom` host a viewport-filling panel that should open at the
// bottom edge. scrollBehavior only sets a one-shot position before the panel has rendered;
// the helper above runs afterwards and chases the document as the panel's content settles
router.afterEach((to) => {
	if (to.meta.scrollToBottom === true) {
		scrollPageToBottom();
	}
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
