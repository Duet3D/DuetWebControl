import i18n from "@/i18n";
import { registerJobViewTab, registerPluginContextMenuItem, registerRoute } from "@/plugins";
import { useCacheStore } from "@/stores/cache";
import { ContextMenuType } from "@/stores/ui";

import GCodeViewer from "./GCodeViewer.vue";
import { DEFAULT_TOOL_COLORS } from "./settings";

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
	order: 30,
	scrollToBottom: true
});

registerPluginContextMenuItem(
	() => i18n.global.t("plugins.gcodeViewer.view3D"),
	"/Plugins/GCodeViewer",
	"mdi-rotate-3d",
	"view-3d-model",
	ContextMenuType.JobFileList
);

const cacheStore = useCacheStore();
cacheStore.registerPluginData("GCodeViewer", "toolColors", DEFAULT_TOOL_COLORS);
cacheStore.registerPluginData("GCodeViewer", "useHQRendering", false);
cacheStore.registerPluginData("GCodeViewer", "useSpecular", true);
cacheStore.registerPluginData("GCodeViewer", "g1AsExtrusion", false);
cacheStore.registerPluginData("GCodeViewer", "viewGCode", false);
cacheStore.registerPluginData("GCodeViewer", "zBelt", false);
cacheStore.registerPluginData("GCodeViewer", "zBeltAngle", 45);
cacheStore.registerPluginData("GCodeViewer", "showWorkplace", true);
cacheStore.registerPluginData("GCodeViewer", "showTool", false);
cacheStore.registerPluginData("GCodeViewer", "persistTravels", false);
cacheStore.registerPluginData("GCodeViewer", "geometryMode", 0);
cacheStore.registerPluginData("GCodeViewer", "nozzleDiameter", 0);
cacheStore.registerPluginData("GCodeViewer", "backgroundColor", "#000000FF");
cacheStore.registerPluginData("GCodeViewer", "bedColor", "#0000FF");
cacheStore.registerPluginData("GCodeViewer", "bedRenderMode", 0);
cacheStore.registerPluginData("GCodeViewer", "progressColor", "#FFFFFFFF");
cacheStore.registerPluginData("GCodeViewer", "showTravels", false);
cacheStore.registerPluginData("GCodeViewer", "showAxes", true);
cacheStore.registerPluginData("GCodeViewer", "showRuler", false);
cacheStore.registerPluginData("GCodeViewer", "rulerInterval", 0);
cacheStore.registerPluginData("GCodeViewer", "showObjectLabels", true);
cacheStore.registerPluginData("GCodeViewer", "showOverlay", true);
cacheStore.registerPluginData("GCodeViewer", "cameraInertia", true);
cacheStore.registerPluginData("GCodeViewer", "perimeterOnly", false);
cacheStore.registerPluginData("GCodeViewer", "unprintedMode", 2);
cacheStore.registerPluginData("GCodeViewer", "opacityPercent", 5);
cacheStore.registerPluginData("GCodeViewer", "colorMode", 2);
cacheStore.registerPluginData("GCodeViewer", "minColorRate", 20);
cacheStore.registerPluginData("GCodeViewer", "maxColorRate", 60);
cacheStore.registerPluginData("GCodeViewer", "minFeedColor", "#0000FF");
cacheStore.registerPluginData("GCodeViewer", "maxFeedColor", "#FF0000");
