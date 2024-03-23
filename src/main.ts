import { createApp } from "vue";

/*
import i18n from "./i18n";
import store from "./store";
import router from "./routes";

import "./components";
import "./plugins";
import "./registerServiceWorker";
*/

import { registerPlugins } from "./vue-plugins";
import App from "./App.vue";

const app = createApp(App);

registerPlugins(app);

app.mount("#app");

export default app;