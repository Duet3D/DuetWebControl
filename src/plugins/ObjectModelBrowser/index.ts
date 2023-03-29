import { registerRoute } from "@/routes";

import ObjectModelBrowser from "./ObjectModelBrowser.vue";

// Register a route via Settings -> Object Model
registerRoute(ObjectModelBrowser, {
	Plugins: {
		ObjectModel: {
			icon: "mdi-file-tree",
			caption: "plugins.objectModelBrowser.menuCaption",
			path: "/Plugins/ObjectModel"
		}
	}
});
