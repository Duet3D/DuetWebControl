# Custom layouts

DWC plugins can replace the entire built-in shell (app bar, navigation drawer, status panel, hub page) with a fully custom UI of their own. This document covers how to register a custom layout from a plugin, how routing interacts with it, and how the user switches between the built-in and the custom layout.

## Overview

A *custom layout* is a Vue component that renders the application's chrome - whatever wraps each page. The built-in shell DWC ships with is one such layout; plugins can register others. Several custom layouts can be registered at once; the user picks which one is active (or returns to the built-in shell) from Settings, or by navigating to a magic URL (see below).

Pages themselves are unaffected. The same vue-router route table is in effect under either layout, the active layout simply provides the surrounding chrome and the `<router-view />` mount point.

## Registering a custom layout

Plugins use the `registerLayout()` function exposed on `window.DWC` (external plugins) or imported from `@/plugins/layout` (built-in plugins).

```ts
const { registerLayout } = window.DWC;

const MyShell = {
    // Vue component definition: render your own app bar, drawer, etc.
    // It MUST contain a <router-view /> for pages to mount inside
    template: `
        <v-app>
            <v-app-bar>...</v-app-bar>
            <v-main><router-view /></v-main>
        </v-app>
    `,
};

registerLayout(MyShell, {
    id: "my-plugin-shell",
    caption: "My Plugin Shell",
});
```

The component is stored via `markRaw` internally, so it does not need to be wrapped in anything special.

### Options

`registerLayout(component, options)` accepts the following options:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | yes | Stable identifier. Persisted as the active-layout selection and used by `unregisterLayout()` to release this exact registration. |
| `caption` | `string` | no | Label shown in the Settings layout picker. Defaults to the `id`. |
| `takeoverOnFirstLoad` | `boolean` | no | When `true` and the user has not yet made an explicit layout choice and no custom layout is active yet, automatically activate this layout on registration. After the user picks a layout in Settings once, this option has no further effect. |
| `routes` | `Record<string, Component>` | no | Per-path component overrides; see [Overriding built-in routes](#overriding-built-in-routes). |

### Registering more than one layout

Several layouts can be registered at the same time, each with a distinct `id`. A second `registerLayout()` call with an `id` that is already registered throws an `Error`; call `unregisterLayout(id)` first to replace that specific registration.

```ts
unregisterLayout("my-plugin-shell");
```

Passing an id that is not registered is a no-op, so a plugin cannot unregister another plugin's layout.

## How the user activates a custom layout

When custom layouts are registered, the Settings page (Display section) lets the user choose the active layout. With a single registered layout, a "Switch to ..." button toggles between it and the built-in shell; with more than one, a dropdown lists the built-in shell alongside every registered layout. The user's choice persists across reloads.

A plugin can also opt to take over automatically on first registration by passing `takeoverOnFirstLoad: true`. This only applies when the user has never made an explicit choice and no custom layout is active yet; once the user picks a layout in Settings, their preference wins.

### The /BuiltInLayout magic URL

If a custom layout's chrome breaks or the user wants a quick way back to the stock shell, navigating to `/BuiltInLayout` resets the layout to built-in and redirects to `/`. The switch runs in a navigation guard, so it works even when your custom shell does not route to this path itself, and regardless of which page the user came from.

## Routing under a custom layout

Vue Router is global, not per-layout. Every route registered in DWC - file-based pages, plugin-registered pages - resolves the same way regardless of which layout is active. The active layout's `<router-view />` is the mount point.

Three things follow from that:

1. **Your shell must contain `<router-view />`** somewhere inside it. Without it, no page can render and the URL bar effectively does nothing.
2. **Existing URLs keep working.** `/Console`, `/Settings/Display`, `/Jobs/...`, etc. are all reachable; they render inside your shell instead of the built-in shell.
3. **You build your own navigation UI** (app bar links, drawer entries, breadcrumbs, ...). Three common approaches:

   - **Mirror DWC's navigation** by reading the menu store. This automatically picks up plugin pages too:

     ```ts
     const { useMenuStore } = window.DWC;
     const menu = useMenuStore();
     // menu.allItems - flat list across categories
     // menu.visibleCategories - category metadata
     // menu.itemsByCategory(key) - items in one category
     ```

   - **Hardcoded subset.** List only the paths your plugin wants to surface. Simple but does not pick up newly-installed plugins.
   - **Fully custom.** Build your own nav from whatever sources you like; use `<router-link>` / `router.push()` to navigate.

## Adding plugin pages

`registerRoute()` (existing API) adds a page to the global router and to the navigation menu. Pages added this way are reachable from both the built-in layout and any custom layout.

```ts
const { registerRoute } = window.DWC;

registerRoute(MyPage, {
    Plugins: {
        MyPage: {
            icon: "mdi-puzzle",
            caption: "My Page",
            path: "/Plugins/MyPlugin/MyPage",
        },
    },
});
```

### Dynamic add/remove

For plugins that create pages at runtime (for example a button-grid designer that lets the user define new tabs), pair `registerRoute()` with `unregisterRoute(path)`:

```ts
const { registerRoute, unregisterRoute } = window.DWC;

// Create
registerRoute(GeneratedPage, {
    Plugins: { Generated: { icon: "mdi-grid", caption: "My Grid", path: "/Plugins/MyPlugin/Grid-42" } },
});

// Later, when the user deletes that page
unregisterRoute("/Plugins/MyPlugin/Grid-42");
```

`unregisterRoute()` removes both the route from vue-router and the corresponding entry from the navigation drawer. No-op when the path is not currently registered.

## Overriding built-in routes

The `routes` option on `registerLayout()` lets the custom layout supply its own component for an existing path. While this layout is active, the URL renders the plugin's component; while it is not (the user switched back to built-in, or to another layout), the URL renders DWC's original component. If two layouts override the same path, whichever is active wins. `unregisterLayout()` drops that layout's overrides; a path returns to DWC's component once no registered layout overrides it any longer.

```ts
registerLayout(MyShell, {
    id: "my-plugin-shell",
    routes: {
        "/Console":      MyConsole,
        "/Settings/:tab?": MySettings,
    },
});
```

The path keys must match vue-router's canonical form - the strings you see in `router.getRoutes().map(r => r.path)`, not the file-syntax keys (e.g. `/Settings/:tab?`, not `/Settings/[[tab]]`). When an override path does not match any registered route, a `console.warn` is logged that lists the available paths so the mistake is easy to spot.

Per-component settings (managed by the `useComponentSettings` composable) automatically derive separate identifiers for the original and the overriding component, so the two pages do not share state.

## Auto-recovery when a plugin fails to load

If the user previously activated a custom layout and the providing plugin later fails to load (uninstalled, network error, etc.), DWC clears the preference once plugin loading has settled (`dwcPluginsLoaded` event), reverts to the built-in shell, and shows a one-time warning. On the next plugin load, `takeoverOnFirstLoad` can re-activate the layout if the plugin still wants to claim it.

## Cleanup checklist

When your plugin is being uninstalled or unloaded:

```ts
unregisterRoute("/Plugins/MyPlugin/Foo");      // for each registerRoute call
unregisterRoute("/Plugins/MyPlugin/Bar");
unregisterLayout("my-plugin-shell");           // restores all route overrides and the stock shell
```

Both functions are idempotent and safe to call regardless of whether a registration is currently active.
