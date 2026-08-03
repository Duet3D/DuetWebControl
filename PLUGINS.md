# DuetWebControl - Third-Party Plugin Development

This guide covers writing plugins for DuetWebControl (DWC) on the current stack: Vue 3 / Vuetify 4 / Pinia / vue-router 5, built with Vite.

If you wrote plugins against earlier DWC versions (v3.4 / v3.5 / v3.6 / v3.7), see [Migrating from earlier DWC](#migrating-from-earlier-dwc) at the bottom - the registration APIs and runtime surface changed in non-trivial ways.

## Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Two development workflows](#two-development-workflows)
4. [Plugin layout](#plugin-layout)
5. [The plugin manifest (`plugin.json`)](#the-plugin-manifest-pluginjson)
6. [Entry point](#entry-point)
7. [Importing from DWC](#importing-from-dwc)
8. [Registration APIs](#registration-apis)
9. [Object model patching and code interception](#object-model-patching-and-code-interception)
10. [Using Vuetify and DWC components in templates](#using-vuetify-and-dwc-components-in-templates)
11. [Plugin data persistence](#plugin-data-persistence)
12. [Internationalisation (i18n)](#internationalisation-i18n)
13. [Plain-JavaScript plugins (no build step)](#plain-javascript-plugins-no-build-step)
14. [Building + packaging](#building--packaging)
15. [Installing](#installing)
16. [Migrating from earlier DWC](#migrating-from-earlier-dwc)
17. [Reference implementations](#reference-implementations)

---

## Overview

A DWC plugin is a small package that extends the UI at runtime. It can:

- Add menu items + routes for new pages (and remove them again on the fly)
- Add tabs to the Settings page
- Add tabs to the Job Status view
- Replace DWC's entire shell with a custom layout (see [CUSTOM-LAYOUT.md](./CUSTOM-LAYOUT.md))
- Register custom Vuetify themes that the user can pick from Settings
- Add entries to context menus (e.g. the job-file-list right-click menu)
- Register translatable messages
- Persist its own cache + settings in DWC's store
- Reuse DWC's own components, Vuetify components, Pinia stores, vue-i18n instance, and the live object model

Each plugin ships as a ZIP that DWC users install through the Settings -> Plugins page. The ZIP contains a manifest (`plugin.json`), the compiled JavaScript bundle, optional CSS, and any companion files (DSF backend, SD-card resources).

## Prerequisites

- Node.js (LTS) - install from your distro or https://nodejs.org/
- A DWC working tree (`git clone https://github.com/Duet3D/DuetWebControl && cd DuetWebControl && npm install`)
- A Duet board (or a DSF-based SBC) for testing - or just `npm run dev` for an unconnected dev session

If you're testing against a remote standalone Duet board, allow cross-origin requests by sending `M586 C"*"` to the board first.

## Two development workflows

You can develop a plugin in either of two layouts. Both produce the same kind of installable ZIP.

### In-tree (recommended during active development)

Create a directory directly under DWC's `src/plugins/`:

```
DuetWebControl/
  src/plugins/
    MyPlugin/
      plugin.json
      index.ts
      MyComponent.vue
      i18n/
        en.json
        de.json
```

Then `npm run dev`. The Vite plugin at `vite/dwc-plugins.ts` auto-discovers every `src/plugins/<id>/plugin.json` and loads it as a built-in plugin. You get full HMR - edit a `.vue` file and the page updates instantly.

When you're ready to ship, build the same source tree as an external ZIP:

```bash
node scripts/build-plugin.js src/plugins/MyPlugin
```

The script writes `MyPlugin-<version>.zip` next to your plugin directory. That ZIP is what end users install.

### Standalone repository

Your plugin lives in its own git repository, outside DWC:

```
MyPlugin/
  plugin.json
  src/
    index.ts
    MyComponent.vue
    i18n/
      en.json
      de.json
```

To build, you still need a DWC checkout (the build script runs Vite against DWC's externals/globals config). Run from inside the DWC tree:

```bash
node scripts/build-plugin.js /path/to/MyPlugin
```

Same output - `MyPlugin-<version>.zip` in the plugin directory.

The standalone layout is the right choice for distribution: your plugin has its own git history, its own `package.json` if you need plugin-only deps, and DWC contributors don't have to know about it. The in-tree layout is just a convenience for fast iteration.

## Plugin layout

| File / dir | Required? | Purpose |
| --- | --- | --- |
| `plugin.json` | Yes | Manifest - identity, version, dependencies, file lists |
| `index.ts` (or `index.js`) | Yes | Entry point - registers routes/tabs/menu items |
| `<Component>.vue` | Optional | Vue SFCs the plugin renders |
| `i18n/<locale>.json` | Optional | Translatable message bundles |
| `dwc/` | Optional | Extra DWC-side static assets bundled into the ZIP under `dwc/...` |
| `dsf/` | Optional | DSF (Duet Software Framework) plugin payload - SBC-side files |
| `sd/` | Optional | Files that get copied to the printer's SD card on install |

The build script also accepts these entry-point variants if you prefer them: `src/index.ts`, `src/index.js`, `dwc-src/index.ts`, `dwc-src/index.js`.

## The plugin manifest (`plugin.json`)

Minimal:

```json
{
  "id": "MyPlugin",
  "name": "My Plugin",
  "author": "Your Name",
  "version": "auto",
  "license": "GPL-3.0-or-later",
  "homepage": "https://github.com/you/MyPlugin",
  "dwcVersion": "auto"
}
```

Field reference:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Must match `[a-zA-Z0-9 .\-_]`, max 32 chars. Compared case-insensitively, so two ids differing only in case are the same plugin and cannot coexist. Used as the directory name and the chunk filename |
| `name` | string | Human-readable display name |
| `author` | string | Free-form |
| `version` | string | Plugin version. `"auto"` resolves to the DWC version at build time; `"auto-major"` resolves to `<major>.<minor>`; `"auto-minor"` resolves to `<major>.<minor>.<patch>` with any pre-release suffix stripped (e.g. `3.7.0-alpha.4` -> `3.7.0`) |
| `license` | string | SPDX identifier preferred |
| `homepage` | string | Optional URL |
| `dwcVersion` | string | Minimum DWC version. Same `"auto"` / `"auto-major"` / `"auto-minor"` placeholders accepted |
| `sbcDsfVersion` | string | Optional - minimum DSF version for SBC plugins |
| `rrfVersion` | string | Optional - minimum RepRapFirmware version |
| `tags` | string[] | Optional - free-form keywords for the plugin browser |
| `sbcPermissions` | string[] | Optional - DSF permissions the plugin requires. Validated against the `SbcPermission` enum from `@duet3d/objectmodel` |
| `dwcDependencies` | string[] | Optional - other DWC plugins that must be loaded first |
| `sbcDependencies` | string[] | Optional - DSF dependencies |
| `dwcFiles` / `dsfFiles` / `rrfFiles` | string[] | Bundled file lists. `build-plugin-pkg.js` populates these automatically; `build-plugin.js` leaves them empty |

## Entry point

The entry point runs once at plugin load time. Use it to register everything the plugin contributes to DWC.

```ts
// MyPlugin/index.ts
import { registerRoute, registerSettingTab, registerPluginMessages } from "DuetWebControl";
import en from "./i18n/en.json";
import de from "./i18n/de.json";

import MyPage from "./MyPage.vue";
import MySettingsTab from "./MySettingsTab.vue";

// Make the plugin's strings available to $t(...) under the `plugins.myPlugin.*` namespace
registerPluginMessages("myPlugin", { en, de });

// Add a Plugins menu entry that lands on `/Plugins/MyPlugin`
registerRoute(MyPage, {
    Plugins: {
        MyPlugin: {
            icon: "mdi-puzzle",
            caption: "plugins.myPlugin.menuCaption",
            path: "/Plugins/MyPlugin",
        },
    },
});

// Add a tab on the Settings page
registerSettingTab({
    key: "myPlugin",
    icon: "mdi-cog",
    caption: "plugins.myPlugin.settingsCaption",
    component: MySettingsTab,
});
```

For TypeScript plugins, the entry's `import` lines are externalised at build time - no DWC types end up bundled. The build scripts type-check your sources against DWC's real types before compiling (see [Building + packaging](#building--packaging)), and runtime resolution goes through `window.DWC` (see next section).

## Importing from DWC

Two import-string conventions are supported, both resolved by `scripts/build-plugin.js`:

- `import { foo } from "DuetWebControl"` - the recommended canonical form for new plugins
- `import { foo } from "@/plugins"` / `import i18n from "@/i18n"` / `import { useMachineStore } from "@/stores/machine"` - for in-tree plugins that already use DWC's path aliases

Both styles resolve to the same `window.DWC.*` global at runtime. The plugin's IIFE bundle never inlines a copy of DWC, Vue, Vuetify or any of the `@duet3d/*` packages - it references whatever the host DWC instance ships.

What's available:

| Import | Runtime source |
| --- | --- |
| `registerRoute`, `unregisterRoute`, `registerCategory`, `registerSettingTab`, `unregisterSettingTab`, `registerJobViewTab`, `unregisterJobViewTab`, `registerLayout`, `unregisterLayout`, `registerTheme`, `unregisterTheme`, `registerPluginContextMenuItem`, `registerPluginMessages` | `DWC.<name>` |
| `useMachineStore`, `useSettingsStore`, `useCacheStore`, `useUiStore`, `ContextMenuType` | `DWC.<name>` |
| `pluginAssetUrl` (resolve a bundled `dwc/` asset's runtime URL) | `DWC.pluginAssetUrl` |
| `useConfirmDialog`, `useInputDialog` (and DWC's other composables) | `DWC.<name>` |
| `Events` (the global event bus) | `DWC.Events` |
| `i18n` | `DWC.i18n` |
| `vue` (and `ref`, `computed`, `watch`, `defineComponent`, etc.) | `DWC.Vue` |
| `vue-router`, `pinia`, `vue-i18n` | `DWC.VueRouter`, `DWC.Pinia`, `DWC.VueI18n` |
| `@duet3d/objectmodel`, `@duet3d/connectors` | `DWC.ObjectModel`, `DWC.Connectors` |
| `vuetify/components` (every Vuetify component) | `DWC.VuetifyComponents` |
| `DuetWebControl/components` (DWC's public component palette) | `DWC.Components` |

## Registration APIs

### `registerRoute(component, menu, order?)`

Adds a menu entry and a route that renders `component`. `menu` is a nested object keyed by category -> route name, where each leaf describes the entry:

```ts
registerRoute(MyPage, {
    Job: {
        MyJobTool: {
            icon: "mdi-tools",
            caption: "plugins.myPlugin.jobToolCaption",
            path: "/Plugins/MyJobTool",
            order: 30,
        },
    },
});
```

`order` (lower = leftmost / topmost) controls position relative to built-in and other plugin entries. Built-in items typically use `order: 10..50`.

### `unregisterRoute(path)`

Tear down a route previously added via `registerRoute`. Removes both the vue-router record and the matching navigation drawer entry. No-op when the path was never registered.

```ts
import { registerRoute, unregisterRoute } from "DuetWebControl";

// Earlier, after the user defined a new button page in the plugin's designer
registerRoute(GeneratedPage, {
    Plugins: { Generated: { icon: "mdi-grid", caption: "My Grid", path: "/Plugins/MyPlugin/Grid-42" } },
});

// Later, when the user deletes that page
unregisterRoute("/Plugins/MyPlugin/Grid-42");
```

This is what plugins with a built-in editor or designer use to add and remove pages on the fly.

### `registerCategory(key, icon, caption, order?)`

Add a brand-new top-level menu category. Most plugins don't need this - if you contribute a single entry under an existing category (Control / Job / Files / Plugins / Preferences), call `registerRoute` directly and the category is implicit.

### `registerSettingTab(tab)`

Add a tab to the Settings page.

```ts
registerSettingTab({
    key: "myPlugin",              // stable identifier, also the v-window tab value
    icon: "mdi-cog",
    caption: "plugins.myPlugin.settingsCaption",
    component: MySettingsTab,
    order: 50,                    // optional, defaults to 100
    translated: false,            // optional, default false. Set true if `caption` is already a translated literal
});
```

If `translated: true` is set, `caption` is rendered verbatim. Otherwise it's treated as an i18n key and passed through `$t(...)`.

### `unregisterSettingTab(key)`

Remove a tab previously registered with the matching `key`. Useful in plugin hot-reload scenarios.

### `registerJobViewTab(tab)`

Add a tab to the tabbed panel on the Job Status page, alongside the built-in layer chart and the G-code stream view. Same shape as `registerSettingTab`, plus an optional reactive `condition` for visibility:

```ts
import { registerJobViewTab } from "DuetWebControl";
import MyJobInsight from "./MyJobInsight.vue";

registerJobViewTab({
    key: "myJobInsight",                                  // stable identifier
    icon: "mdi-chart-arc",
    caption: "plugins.myPlugin.jobInsightCaption",
    component: MyJobInsight,
    order: 50,                                            // optional, defaults to 100
    condition: () => useMachineStore().model.job.file !== null,  // optional reactive gate
});
```

The component renders inside DWC's existing Job Status shell - reuse `useMachineStore()` for job state, `useCacheStore()` / `useSettingsStore()` for persistence. As with `registerSettingTab`, duplicate keys are silently ignored.

### `unregisterJobViewTab(key)`

Remove a job-view tab previously registered with the matching `key`.

### `registerLayout(component, options)` / `unregisterLayout(id)`

Replace DWC's entire shell (app bar, navigation drawer, status panel, hub) with a custom one of your own. Single-slot - only one custom layout can be registered at a time; a second registration throws. The user toggles between the built-in shell and your custom layout from the Settings page, or returns to the built-in shell via the `/BuiltInLayout` magic URL.

See [CUSTOM-LAYOUT.md](./CUSTOM-LAYOUT.md) for the full guide: lifecycle, route overrides, building the in-shell navigation UI, auto-recovery if the plugin fails to load, and how this interacts with `registerRoute` / `unregisterRoute`.

### `registerTheme(name, definition)` / `unregisterTheme(name)`

Register a Vuetify theme at runtime. The theme becomes selectable from a "Theme" dropdown in **Settings -> Display** that only appears when at least one plugin theme is registered.

```ts
import { registerTheme, unregisterTheme } from "DuetWebControl";

registerTheme("acme-light", {
    dark: false,
    caption: "Acme Light",                       // optional, shown in the Settings dropdown; defaults to the name
    colors: {
        // Any subset of Vuetify's color tokens (https://vuetifyjs.com/en/features/theme/).
        // Tokens you don't list are inherited from the matching built-in base (light or dark
        // depending on `dark` above), so a minimal palette overriding only primary + secondary
        // works too
        primary:   "#ff6b35",
        secondary: "#004e89",
    },
    variables: {                                  // optional - Vuetify theme variables
        "border-color":      "#1a1a1a",
        "hover-opacity":     0.08,
    },
});

// Later, on plugin teardown
unregisterTheme("acme-light");
```

The `name` argument is the Vuetify theme identifier - cannot be `"light"` or `"dark"` (reserved), and a duplicate registration throws. Color tokens are CSS custom properties that update reactively, so `<v-btn color="primary">` and any `bg-surface`, `text-on-surface` etc. classes pick up the new values immediately.

Theme persistence works automatically - if the user had selected a plugin theme in a previous session and the plugin registers it again on load, the active theme switches over the moment `registerTheme` runs. While the plugin is not loaded the binding falls back to `darkTheme ? "dark" : "light"` so the UI never references a missing theme.

`unregisterTheme(name)` is a no-op when the name wasn't registered. If the removed theme is currently active, the binding falls back to the dark/light setting.

**What this doesn't cover**: Vuetify generates typography, spacing and shape classes (`.text-headline-medium`, `.elevation-3`, ...) at build time. Color tokens are reactive CSS variables; type / spacing / shape changes still need a `<style>` override injected into `<head>`. Custom fonts likewise need a `<link>` injection plus a `--v-font-family-*` binding. Drop-in re-skin via colors is supported here; full visual rebrands are still possible but require some CSS plumbing.

### `registerPluginContextMenuItem(name, path, icon, action, contextMenuType)`

Add a right-click entry to a DWC context menu. Currently the only supported menu is `ContextMenuType.JobFileList` (right-click on a job file in the Jobs page or Explorer).

```ts
import { registerPluginContextMenuItem, ContextMenuType } from "DuetWebControl";

registerPluginContextMenuItem(
    () => i18n.global.t("plugins.myPlugin.viewLabel"),  // name (or a string)
    "/Plugins/MyPlugin",                                 // optional path to navigate to
    "mdi-eye",                                           // MDI icon
    "my-plugin-view",                                    // event name DWC will emit on click
    ContextMenuType.JobFileList,                         // target context menu
);
```

When the user clicks the item, DWC emits the named event via `Events.emit("my-plugin-view", fullPath)`. The plugin listens with `Events.on("my-plugin-view", handler)`.

For the typed event channel to accept your action name, declare it in `src/utils/events.ts` if you're contributing the plugin in-tree. External plugins can use any string - the type cast happens at the framework boundary.

### `registerPluginMessages(pluginId, messagesPerLocale)`

Merge the plugin's i18n messages into DWC's shared vue-i18n instance under `plugins.<pluginId>.*`. See [Internationalisation](#internationalisation-i18n).

### Per-plugin persisted data

Call `registerPluginData(pluginId, key, defaultValue)` on either the cache store or the settings store. See [Plugin data persistence](#plugin-data-persistence).

## Object model patching and code interception

Two hooks let a plugin present hardware DWC knows nothing about as if the firmware reported it: one augments the object model as updates come in, the other rewrites or answers codes on their way out. Together they cover setups where a peripheral - a chamber heater on an external PID controller, a bed run by a separate box - is controlled by something other than the Duet, without touching config.g.

**Read this first.** Interception only sees codes issued by DWC. A code from a job file, a macro, `daemon.g`, a trigger or PanelDue is executed by the firmware and never reaches the browser, so a peripheral built this way responds to the UI but not to a sliced job's own `M141`. If you need that too, the interception has to happen in DSF instead, which means an SBC installation and a DSF plugin intercepting on the code channel - a DWC plugin cannot do it.

### `registerModelPatch(id, patch)` / `unregisterModelPatch(id)`

```ts
registerModelPatch("MyPlugin", (payload: any, model: ObjectModel) => {
	// payload is the incoming update, modified in place before it is merged
});
```

The callback runs on every update payload before it is merged into the typed model, including the full model that arrives on connect - which is why injected data survives a reconnect without further bookkeeping. It runs at the connector's poll rate, so keep it cheap, and it must not call `patchModel` itself.

`model` is the typed object model as it still is, before the payload is applied, for patches that depend on the current state. A callback that throws is logged and skipped; updates keep flowing.

### `patchModel(payload)`

Merge a payload into the object model as if the machine had sent it. Use this for data that arrives on your own schedule - a temperature polled from an external controller - rather than keeping it in a closure that the next model patch reads:

```ts
patchModel({ sensors: { analog: [null, null, { lastReading: 87.5 }] } });
```

### `registerCodeInterceptor(id, interceptor)` / `unregisterCodeInterceptor(id)`

```ts
registerCodeInterceptor("MyPlugin", (code: string) => {
	if (code.startsWith("M141")) {
		return { code: `M118 P1 S"${code}"` };    // send this instead
	}
	if (code === "M999") {
		return { reply: "Rebooting external controller" };    // handled, do not send
	}
	// returning nothing lets the code pass unchanged
});
```

Returning `{ code }` replaces the code, `{ reply }` keeps it from being sent at all and hands that reply back to whoever called `sendCode` - the console logs it like a real one. Interceptors run in registration order, a rewritten code is passed on to the remaining ones, and the first reply ends the chain. The callback may be async, for talking to a device over HTTP before answering. One that throws is logged and skipped, so a broken plugin cannot make the machine uncontrollable.

DWC logs and reports the original code, not the rewritten one - what the rest of the UI asked for is what the user sees.

### How object model collections merge

Injecting into a collection means playing by the merge rules the model applies to any update, and getting them wrong silently destroys real data:

| Entry in the update | Effect on that index |
| --- | --- |
| `{}` | keeps the existing item untouched |
| `{ ... }` | merges those properties into the existing item |
| `null` | clears the slot |
| missing (array is shorter) | truncates the collection to the array's length |

An array left out of the update entirely is not touched at all. The consequences for an injected item: pick an index above anything `config.g` configures, pad the gap with `null`, fill the real entries with `{}` so they survive, and re-append on **every** update that carries the collection - any payload with a shorter `heat.heaters` truncates the injected heater away again.

### Example: a chamber heater on an external controller

The plugin owns a heater index the firmware does not use, answers `M141` by pushing the setpoint to the external device, and feeds the measured temperature back into the model so the standard chamber controls render:

```ts
import { patchModel, registerCodeInterceptor, registerModelPatch } from "DuetWebControl";

const HEATER = 4, SENSOR = 4;
let active = 0, current = 0;

registerModelPatch("VirtualChamber", (payload, model) => {
	const heaters = payload.heat?.heaters ?? model.heat.heaters.map(() => ({}));
	const sensors = payload.sensors?.analog ?? model.sensors.analog.map(() => ({}));
	while (heaters.length < HEATER) {
		heaters.push(null);
	}
	while (sensors.length < SENSOR) {
		sensors.push(null);
	}

	heaters[HEATER] = { active, current, max: 120, min: -10, sensor: SENSOR, standby: 0, state: (active > 0) ? "active" : "off" };
	sensors[SENSOR] = { name: "Chamber (external)", lastReading: current };
	payload.heat = { ...payload.heat, heaters, chamberHeaters: [HEATER] };
	payload.sensors = { ...payload.sensors, analog: sensors };
});

registerCodeInterceptor("VirtualChamber", async (code) => {
	const match = /^M141(?:\s+P\d+)?\s+S(-?\d+(?:\.\d+)?)/i.exec(code);
	if (match === null) {
		return;
	}

	active = parseFloat(match[1]);
	await fetch(`http://chamber.local/setpoint?value=${active}`);
	return { reply: "" };
});

setInterval(async () => {
	current = parseFloat(await (await fetch("http://chamber.local/temperature")).text());
	patchModel({});    // an empty payload just re-runs the patches
}, 2000);
```

Two practical notes: the injected values live in the plugin's own variables because the patch has to reassert them on every update, and cross-origin requests to the external device need CORS headers on that device, see [Cross-origin requests](#cross-origin-requests-and-mixed-content).

## Using Vuetify and DWC components in templates

Templates inside your plugin's `.vue` files can use Vuetify components and DWC components by tag name - no explicit import needed:

```vue
<template>
    <v-card>
        <v-card-title>{{ $t("plugins.myPlugin.title") }}</v-card-title>
        <v-card-text>
            <FileList mode="macros" />
            <CodeButton :code="'G28'" color="primary">Home all</CodeButton>
        </v-card-text>
    </v-card>
</template>
```

This works because DWC globally registers every Vuetify component and DWC component on the Vue app before any external plugin loads (the registration happens lazily on first external-plugin load, so users with no plugins pay nothing for it).

If you prefer explicit ES imports for clarity, both styles compile correctly:

```ts
import { VCard, VBtn } from "vuetify/components";
import { FileList, CodeButton } from "DuetWebControl/components";
```

The DWC component palette currently includes:

- **Buttons**: `CodeButton`
- **Inputs**: `CodeInput`, `ControlInput`, `ListEditor`, `PercentageInput`
- **Lists**: `EventList`, `FileList`, `MacroList`
- **Charts**: `LayerChart`, `TemperatureChart`
- **Dialogs**: `ConfirmDialog`, `InputDialog`, `MessageBoxDialog`
- **Displays**: `JobProgress`, `StatusLabel`
- **Editor**: `MonacoEditor`

Browse `src/components/` for the full source and prop documentation.

## Plugin data persistence

DWC offers two storage tiers backed by Pinia stores - both global, both keyed per plugin. Each store exposes `registerPluginData(pluginId, key, defaultValue)` to declare a key with its initial value and `setPluginData(pluginId, key, value)` to update it at runtime.

```ts
import { useCacheStore, useSettingsStore } from "DuetWebControl";

const cacheStore = useCacheStore();
const settingsStore = useSettingsStore();

// At plugin load time, register defaults so the keys exist for reactive consumers
cacheStore.registerPluginData("myPlugin", "lastViewedTab", "info");
settingsStore.registerPluginData("myPlugin", "preferredColor", "#FF8800");

// At runtime
cacheStore.setPluginData("myPlugin", "lastViewedTab", "advanced");
```

| Store | Persistence | Use for |
| --- | --- | --- |
| `useCacheStore` | Browser localStorage, separate from settings file | UI state, last-selected values, cached computations |
| `useSettingsStore` | Persisted with DWC's settings file (round-trips through export / import) | User-configurable preferences |

Read the values back through the same stores: `useCacheStore().plugins.myPlugin.lastViewedTab`, `useSettingsStore().plugins.myPlugin.preferredColor`.

## Shipping extra assets (WASM, workers, data files)

A plugin's compiled JS and CSS are not the only files it can carry. Anything you drop into a `dwc/` directory next to your sources is bundled into the ZIP and, on install, extracted into DWC's web root. `build-plugin-pkg.js` lists every such file in the manifest's `dwcFiles`. This is how you ship a WebAssembly module, a pre-built web-worker script, an ML model, a lookup table - any binary or data file your plugin loads at runtime rather than imports at build time.

```
MyPlugin/
  src/
    index.ts
  dwc/
    MyPlugin/                 # see the collision note below
      opencv.wasm
      detector.worker.js
      model.bin
```

The loader only injects `.js`/`.css` from `dwcFiles` as `<script>`/`<link>`; everything else just lands on the filesystem for your code to fetch on demand.

Resolve an asset's runtime URL with `pluginAssetUrl`, which prepends DWC's base path (it differs between installs - root, a subpath, an SBC):

```ts
import { pluginAssetUrl } from "DuetWebControl";

// Fetch a WASM module
const wasm = await fetch(pluginAssetUrl("MyPlugin/opencv.wasm"));

// Spin up a worker off the main thread (ship the worker pre-built as an asset)
const worker = new Worker(pluginAssetUrl("MyPlugin/detector.worker.js"), { type: "module" });
```

The argument is the asset's path exactly as it appears in `dwcFiles`, relative to the web root, no leading slash.

Two practical notes:

- **Ship workers pre-built.** The plugin build produces a single IIFE bundle; `new Worker(new URL("./worker.ts", import.meta.url))` is not bundled for you. Compile the worker separately, drop the result in `dwc/`, and instantiate it via `pluginAssetUrl`.
- **Namespace your assets to avoid collisions.** Extra assets extract flat into the shared web root - two plugins that both ship `model.bin` would clobber each other (the compiled JS/CSS are content-hashed and prefixed with the plugin id, so only your extra files are at risk). Put them in a `dwc/<your-plugin-id>/` subfolder, as above, and the `dwcFiles` paths (and your `pluginAssetUrl` calls) carry that prefix.

## Cross-origin requests and mixed content

Some plugins talk to a service that isn't the Duet board - a vision bridge on a PC, an external API, a separate camera host. DWC ships no Content-Security-Policy, so cross-origin `fetch`/`WebSocket`/`XHR` from plugin code is not blocked by DWC itself; the usual CORS rules on the remote server still apply, so that service must send the appropriate `Access-Control-Allow-Origin` headers.

The one case that bites is **mixed content**: if DWC is served over HTTPS, the browser blocks any plain-HTTP request the plugin makes, and no setting on DWC's side can relax that - it's a hard browser policy. If your plugin needs to reach an HTTP-only service, you have two options:

- **Reverse-proxy the service onto DWC's origin.** Expose it under a path on the same host/scheme that serves DWC (e.g. nginx forwarding `/bridge/` to the local service). The request is then same-origin and same-scheme - no mixed-content block, no CORS.
- **Serve the remote service over TLS.** Give the bridge/service its own HTTPS endpoint (a real certificate, or one the client trusts) so the scheme matches.

If DWC is served over plain HTTP, mixed content does not arise and a direct cross-origin request works as long as the remote sends CORS headers.

## Internationalisation (i18n)

Ship your translatable strings as JSON files alongside your source:

```
MyPlugin/
  i18n/
    en.json    { "menuCaption": "My Plugin", "title": "Welcome" }
    de.json    { "menuCaption": "Mein Plugin", "title": "Willkommen" }
```

Register them at load time:

```ts
import { registerPluginMessages } from "DuetWebControl";
import en from "./i18n/en.json";
import de from "./i18n/de.json";

registerPluginMessages("myPlugin", { en, de });
```

The keys land under `plugins.myPlugin.*` in DWC's shared vue-i18n instance. Use them in templates the way you'd use any other DWC key:

```vue
<template>
    <h1>{{ $t("plugins.myPlugin.title") }}</h1>
</template>
```

You can also reuse DWC's own keys directly (`$t("generic.error")`, `$t("button.save")`, ...) since you share one i18n instance.

If you only have a literal string and don't need translation, pass it directly with `translated: true` in the relevant API (e.g. `registerSettingTab({ caption: "My Plugin", translated: true })`).

## Plain-JavaScript plugins (no build step)

For very small plugins you don't need a build chain at all. A single `.js` file using Vue's render-function API works:

```js
// hello-plugin.js
(function () {
    const { h, ref } = DWC.Vue;

    const MyPage = {
        setup() {
            const machineStore = DWC.useMachineStore();
            const count = ref(0);
            return () => h("div", { class: "pa-4" }, [
                h("h1", "Hello from a plain JS plugin"),
                h(DWC.VuetifyComponents.VBtn, {
                    color: "primary",
                    onClick: () => count.value++,
                }, () => `Clicked ${count.value} times`),
                h(DWC.Components.CodeButton, {
                    code: "G28",
                    color: "secondary",
                }, () => "Home all axes"),
            ]);
        },
    };

    DWC.registerRoute(MyPage, {
        Plugins: { MyPlugin: { icon: "mdi-puzzle", caption: "My Plugin", path: "/Plugins/MyPlugin" } },
    });
})();
```

Pair with a `plugin.json`, zip both up as `dwc/js/hello-plugin.js` + `plugin.json`, install.

**One limitation**: DWC bundles Vue's runtime-only build, not runtime+compiler. Plain-JS plugins can't use `template: "<v-btn>..."` strings - they must compose with `h()`. If you want HTML-template-style authoring, use the regular `.vue` SFC workflow instead.

## Building + packaging

Two build scripts ship with DWC:

### Type checking

Both scripts type-check your plugin's `.ts`/`.vue` sources before compiling and abort if they find errors. The check pulls your files into DWC's own type environment, so the externalised imports (`DuetWebControl`, `@/...`, `vue`, `vuetify`, `@duet3d/*`) resolve to DWC's real types - the same checking an in-tree plugin gets from DWC's build, without copying any DWC source into your repo. Only diagnostics in your own files fail the build; DWC-internal ones are ignored.

Two things to know: pure-JavaScript plugins are not type-checked (no opt-in to types), and because DWC auto-imports `ref`/`computed`/etc. for its own code, a missing `import { ref } from "vue"` in your plugin slips past this check but still fails your plugin's compile - so import what you use.

### `scripts/build-plugin.js` - the simple build

```bash
node scripts/build-plugin.js /path/to/plugin
```

Compiles the plugin into an IIFE bundle (`dwc/js/<id>.js` + optional `dwc/css/<id>.css`), copies any `dsf/`, `dwc/`, or `sd/` extras into a `pkg/` staging directory, and zips it up as `<id>-<version>.zip`. The manifest is copied as-is - file list fields stay empty.

### `scripts/build-plugin-pkg.js` - the full package

```bash
node scripts/build-plugin-pkg.js /path/to/plugin
```

Same as above plus auto-populates `dwcFiles`, `dsfFiles`, and `rrfFiles` in the manifest by scanning `dwc/`, `dsf/`, and `sd/`. Use this for releases that should be self-describing on install.

### Build artefacts

After either script:

```
<plugin-dir>/
  dist/                      - compiled IIFE bundle + CSS
  pkg/                       - staging directory matching the ZIP layout
  <id>-<version>.zip         - the installable file
  <id>-<version>-srcmap.zip  - sourcemaps of a stable build, see below
```

Both `dist/` and `pkg/` can be safely deleted between builds.

### Sourcemaps

Prerelease versions (`-alpha`/`-beta`/`-rc`) ship their sourcemaps inside the plugin ZIP, so a browser resolves stack traces on an installed plugin by itself. Stable versions build the maps in hidden mode instead: nothing references them, they stay out of the plugin ZIP, and they are packaged as `<id>-<version>-srcmap.zip` next to it. Keep that file for the releases you publish - a stack trace from a user's console decodes against it with

```bash
node scripts/resolve-stack.js --maps MyPlugin-1.0.0-srcmap.zip trace.txt
```

which prints the original file, line and source line for every frame. `DWC_SOURCEMAP=1` forces shipped maps for a stable build, `DWC_SOURCEMAP=0` skips them entirely.

## Installing

In DWC, navigate to **Settings -> Plugins**, click the upload button, and pick the ZIP. DWC validates the manifest (id, name, author, version, DWC compatibility, SBC permissions), uploads the contents to the board, and registers the plugin.

After install, click the plugin's row to start it. Auto-start on connect is a per-plugin toggle in the same Plugins tab.

Removing a plugin uninstalls it from the board.

### Installing programmatically

A plugin that manages other plugins (an updater, a bundled-plugin installer) can drive the same flow through the machine store:

```ts
import { useMachineStore } from "DuetWebControl";

// installPlugin(zipFilename, zipBlob, start, zipFile?)
await useMachineStore().installPlugin("MyPlugin-1.0.0.zip", zipBlob, true);
```

`start` installs and immediately loads the plugin. The fourth argument is an already-parsed `JSZip` instance; omit it and the store reconstructs one from `zipBlob`. The call validates the manifest and DWC compatibility before uploading, the same as the UI path.

## Migrating from earlier DWC

The plugin API surface changed substantially during the Vue 3 / Vuetify 4 / Pinia / Vite port. Existing v3.4-v3.7 plugins need re-porting; the new platform is not a drop-in.

### Framework idioms

| v3.x | Current |
| --- | --- |
| Vue 2 Options API (`export default { data, computed, methods }`) | Vue 3 Composition API (`<script setup lang="ts">` or `defineComponent({ setup() })`) |
| Vuex (`mapState("machine/model", ...)`) | Pinia (`useMachineStore()`, accessing `.model.move.axes` etc.) |
| Vuetify 2 (`<v-simple-table>`, `<v-list-item-title>` slots, `v-on`, ...) | Vuetify 4 (`<v-table>`, new list slot shape, MD3 typography, ...) |
| `Vue.component('foo', Foo)` global registration | Components imported per-SFC, or registered globally by DWC (see [Using Vuetify and DWC components](#using-vuetify-and-dwc-components-in-templates)) |

### Registration API

| v3.x signature | Current signature |
| --- | --- |
| `registerSettingTab(general: boolean, name, component, caption, translated?, icon?)` | `registerSettingTab({ key, icon, caption, component, translated?, order? })` |
| `registerPluginData(plugin, PluginDataType.globalSetting/machineCache/machineSetting, key, default)` | `useCacheStore().registerPluginData(plugin, key, default)` or `useSettingsStore().registerPluginData(plugin, key, default)` - per-machine variants collapsed to single global types; the store you call IS the type distinction |

The `injectComponent(name, component)` API from v3.x is gone - it existed to work around Vue 2's lack of `<Teleport>`. Use Vue 3's `<Teleport>` directly if you need to render outside your route.

### Import paths

| v3.x | Current |
| --- | --- |
| `import { registerRoute } from '@/routes'` | `import { registerRoute } from "DuetWebControl"` (or `from "@/plugins"`) |
| `import { mapState } from 'vuex'` | `import { useMachineStore } from "DuetWebControl"` |
| `import { i18n } from '@/i18n'` | `import { i18n } from "DuetWebControl"` |

### Build system

The webpack-based build pipeline (`vue-cli-service build-plugin`) is replaced by Vite. Old `webpackChunkName` hints in `src/plugins/index.js` no longer apply - the new build discovers plugins automatically via `vite/dwc-plugins.ts`. Plugin ZIPs produced by the old `npm run build-plugin` script will NOT load - they're webpack chunks linked against DWC's old runtime, incompatible with the new IIFE + `window.DWC` model. Rebuild with `scripts/build-plugin.js`.

### Multi-machine

v3.x's `PluginDataType.machineCache` / `machineSetting` stored values per connected machine. DWC currently runs single-machine; the per-machine variants are gone. If you maintained per-machine state, you'll need to namespace it yourself (e.g. by the connection hostname).

### Events

DWC's global events no longer carry a `machine` field in their payloads (single-machine architecture). Other events were added: `dwcPluginLoaded`, `dwcPluginUnloaded`, `pluginInstalled`, `pluginUninstalled`, connection lifecycle (`connecting`, `connected`, `disconnecting`, `disconnected`, `cacheLoaded`, `settingsLoaded`, ...). See `src/utils/events.ts` for the full type definition.

The event emitter is exposed as `window.DWC.Events` (or `import Events from "@/utils/events"` for an in-tree plugin). Subscribe to `dwcPluginUnloaded` to clean up anything that outlives a component - router guards, global watchers and dialogs are not tied to a component's lifecycle and otherwise leak when the plugin is stopped:

```ts
import Events from "@/utils/events";

const stopGuard = router.beforeEach(/* ... */);
Events.on("dwcPluginUnloaded", (id) => {
    if (id === "MyPlugin") {
        stopGuard();
    }
});
```

## Reference implementations

Four plugins ship in-tree under `src/plugins/`:

| Plugin | What it does | Useful patterns |
| --- | --- | --- |
| `GCodeViewer/` | 3D G-code preview (Babylon.js) | `registerPluginContextMenuItem`, lazy-loaded heavy library, per-plugin cache for tool colours / quality |
| `HeightMap/` | Bed-mesh visualisation | Babylon.js usage, file download from the board |
| `InputShaping/` | Vibration analysis (Chart.js) | Chart.js v4 registration, file list with per-row preview, custom watchers |
| `ObjectModelBrowser/` | Live object-model tree | VTreeview, lazy expansion, deprecation overlay |

Read them top-to-bottom for working examples of every API in this guide.

---

## Submitting your plugin

The Duet3D community plugin index lives at [plugins.duet3d.com](https://plugins.duet3d.com/). Submission guidelines: [plugins.duet3d.com/guide/submission.html](https://plugins.duet3d.com/guide/submission.html).
