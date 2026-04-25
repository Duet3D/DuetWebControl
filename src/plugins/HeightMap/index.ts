import { registerRoute } from "@/plugins";
import HeightMap from "./HeightMap.vue";

registerRoute(HeightMap, {
	Plugins: {
		HeightMap: {
			icon: "mdi-grid",
			caption: "plugins.heightmap.menuCaption",
			path: "/Plugins/HeightMap",
			order: 20
		}
	}
});
