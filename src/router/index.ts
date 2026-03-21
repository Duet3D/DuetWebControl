/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { setupLayouts } from "virtual:generated-layouts";
import { routes, handleHotUpdate } from "vue-router/auto-routes";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: setupLayouts([...routes] as RouteRecordRaw[]),
});

if (import.meta.hot) {
	handleHotUpdate(router);
}

// When a lazily-imported chunk fails to load - typically because the app was
// redeployed and the old hashed chunks are gone - reload once to pick up the new
// build. Vite fires `vite:preloadError` for exactly this case; the sessionStorage
// guard stops a reload loop if the failure persists
window.addEventListener("vite:preloadError", (event) => {
	if (sessionStorage.getItem("dwc:preload-reloaded")) {
		console.error("Chunk preload failed and reloading did not fix it", event);
		return;
	}
	sessionStorage.setItem("dwc:preload-reloaded", "true");
	window.location.reload();
});

router.isReady().then(() => {
	sessionStorage.removeItem("dwc:preload-reloaded");
});

export default router
