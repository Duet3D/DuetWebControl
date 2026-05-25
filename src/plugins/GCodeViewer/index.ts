import i18n from "@/i18n";
import { registerPluginContextMenuItem, registerRoute } from "@/plugins";
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
