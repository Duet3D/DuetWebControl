import { registerRoute } from "@/plugins";
import ObjectModelBrowser from "./ObjectModelBrowser.vue";

registerRoute(ObjectModelBrowser, {
	Plugins: {
		ObjectModel: {
			icon: "mdi-file-tree",
			caption: "plugins.objectModelBrowser.menuCaption",
			path: "/Plugins/ObjectModel"
		}
	}
});
