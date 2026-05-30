/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App
 */

// Vue plugins
import { registerPlugins } from "@/vue-plugins";

// Components
import App from "./App.vue";

// Composables
import { createApp } from "vue";

// Directives
import { vContextMenu } from "@/directives/contextMenu";
import { vHint } from "@/directives/hint";

// Events
import "@/utils/eventHandlers";

// Service worker
import "@/registerServiceWorker";

const app = createApp(App);

registerPlugins(app);
app.directive("context-menu", vContextMenu);
app.directive("hint", vHint);

app.mount("#app");
