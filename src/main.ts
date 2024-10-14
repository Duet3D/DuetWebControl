/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Vue plugins
import { registerPlugins } from "@/vue-plugins";

// Components
import App from "./App.vue";

// Composables
import { createApp } from "vue";

// Events
import "@/utils/eventHandlers";

const app = createApp(App);

registerPlugins(app);

app.mount("#app");
