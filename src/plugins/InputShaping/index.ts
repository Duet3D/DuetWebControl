import { registerRoute } from "@/plugins";
import InputShaping from "./InputShaping.vue";

registerRoute(InputShaping, {
	Plugins: {
		InputShaping: {
			icon: "mdi-transition",
			caption: "Input Shaping",
			translated: true,
			path: "/Plugins/InputShaping",
			pageFill: true
		}
	}
});
