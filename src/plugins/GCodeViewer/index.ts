import i18n from "@/i18n";
import { registerPluginContextMenuItem, registerRoute } from "@/plugins";
import { PluginDataType, registerPluginData } from "@/stores";
import { ContextMenuType } from "@/stores/ui";

import GCodeViewer from "./GCodeViewer.vue";

registerRoute(GCodeViewer, {
	Job: {
		GCodeViewer: {
			icon: "mdi-rotate-3d",
			caption: "plugins.gcodeViewer.caption",
			path: "/Plugins/GCodeViewer",
			order: 30
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

registerPluginData("GCodeViewer", PluginDataType.cache, "toolColors", ["#00FFFF", "#FF00FF", "#FFFF00", "#000000", "#FFFFFF"]);
registerPluginData("GCodeViewer", PluginDataType.cache, "useHQRendering", false);
registerPluginData("GCodeViewer", PluginDataType.cache, "useSpecular", true);
registerPluginData("GCodeViewer", PluginDataType.cache, "g1AsExtrusion", false);
registerPluginData("GCodeViewer", PluginDataType.cache, "viewGCode", false);
registerPluginData("GCodeViewer", PluginDataType.cache, "zBelt", false);
registerPluginData("GCodeViewer", PluginDataType.cache, "zBeltAngle", 45);
registerPluginData("GCodeViewer", PluginDataType.cache, "showWorkplace", true);
registerPluginData("GCodeViewer", PluginDataType.cache, "showCursor", false);
