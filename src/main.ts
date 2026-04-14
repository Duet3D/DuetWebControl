import "@mdi/font/css/materialdesignicons.css";
import Vue from "vue";
import Vuetify from "vuetify";

import i18n from "./i18n";
import store from "./store";
import router from "./routes";

import "./components";
import "./plugins";
import "./registerServiceWorker";

import App from "./App.vue";

// Enable compatibilty mode for array updates for @duet3d/objectmodel library
(window as any)._duetModelSetArray = (array: object, index: string | number, value: any) => Vue.set(array, index, value);

Vue.config.productionTip = false;
Vue.use(Vuetify);

// Preload the monaco-editor chunk in the background after the page is fully
// loaded, so it's already cached when the user first opens the file editor
window.addEventListener("load", () => {
	const schedule = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
	schedule(() => import("@/utils/monaco"));
});

export default new Vue({
	el: "#app",
	i18n,
	render: h => h(App),
	router,
	store,
	vuetify: new Vuetify({
		theme: {
			dark: (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) || false
		},
		icons: {
			iconfont: "mdiSvg",
		},
		lang: { t: (key, ...params) => i18n.t(key, params) }
	})
});
