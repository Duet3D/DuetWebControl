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

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
	if (err?.message?.includes?.("Failed to fetch dynamically imported module")) {
		if (!localStorage.getItem("vuetify:dynamic-reload")) {
			console.log("Reloading page to fix dynamic import error");
			localStorage.setItem("vuetify:dynamic-reload", "true");
			location.assign(to.fullPath);
		} else {
			console.error("Dynamic import error, reloading page did not fix it", err);
		}
	} else {
		console.error(err);
	}
})

router.isReady().then(() => {
	localStorage.removeItem("vuetify:dynamic-reload");
})

export default router
