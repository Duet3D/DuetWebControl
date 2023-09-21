import "@mdi/font/css/materialdesignicons.css";
import { createPinia, PiniaVuePlugin } from "pinia";
import Fragment from "vue-fragment";
import Vue from "vue";
import Vuetify from "vuetify";

import i18n from "./i18n";
import router from "./routes";

import "./components";
import "./plugins";
import "./store/observer";
import "./utils/eventHandlers";

import "./registerServiceWorker";
import App from "./App.vue";

// Enable compatibilty mode for array updates for @duet3d/objectmodel library
(window as any)._duetModelSetArray = (array: object, index: string | number, value: any) => Vue.set(array, index, value);

Vue.config.productionTip = false;
Vue.use(PiniaVuePlugin)
Vue.use(Fragment.Plugin);			// obsolete when upgraded to Vue 3
Vue.use(Vuetify);

const pinia = createPinia();

export default new Vue({
	el: "#app",
	i18n,
	pinia,
	render: h => h(App),
	router,
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
