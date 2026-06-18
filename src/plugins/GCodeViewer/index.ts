import i18n from "@/i18n";
import { registerJobViewTab, registerPluginContextMenuItem, registerRoute } from "@/plugins";
import { useCacheStore } from "@/stores/cache";
import { ContextMenuType } from "@/stores/ui";

import GCodeViewer from "./GCodeViewer.vue";

registerRoute(GCodeViewer, {
	Job: {
		GCodeViewer: {
			icon: "mdi-rotate-3d",
			caption: "plugins.gcodeViewer.caption",
			path: "/Plugins/GCodeViewer",
			// Deep-link form: /Plugins/GCodeViewer/<volume>/<sd-path> previews a specific file,
			// mirroring the Explorer's volume + catch-all path route
			routePath: "/Plugins/GCodeViewer/:volume?/:path(.*)?",
			pageFill: true,
			scrollToBottom: true
		}
	}
});

// Also offer the viewer as a tab in the Job Status view panel. Opened without route params the
// component auto-loads the running job (see loadFromRoute), which is exactly what's wanted here
registerJobViewTab({
	key: "gcodeViewer",
	icon: "mdi-rotate-3d",
	caption: "plugins.gcodeViewer.caption",
	component: GCodeViewer,
	order: 30
});

registerPluginContextMenuItem(
	() => i18n.global.t("plugins.gcodeViewer.view3D"),
	"/Plugins/GCodeViewer",
	"mdi-rotate-3d",
	"view-3d-model",
	ContextMenuType.JobFileList
);

const cacheStore = useCacheStore();
cacheStore.registerPluginData("GCodeViewer", "toolColors", ["#00FFFF", "#FF00FF", "#FFFF00", "#000000", "#FFFFFF"]);
cacheStore.registerPluginData("GCodeViewer", "useHQRendering", false);
cacheStore.registerPluginData("GCodeViewer", "useSpecular", true);
cacheStore.registerPluginData("GCodeViewer", "g1AsExtrusion", false);
cacheStore.registerPluginData("GCodeViewer", "viewGCode", false);
cacheStore.registerPluginData("GCodeViewer", "zBelt", false);
cacheStore.registerPluginData("GCodeViewer", "zBeltAngle", 45);
cacheStore.registerPluginData("GCodeViewer", "showWorkplace", true);
cacheStore.registerPluginData("GCodeViewer", "showCursor", false);
