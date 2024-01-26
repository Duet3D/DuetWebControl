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
