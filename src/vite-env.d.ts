/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Virtual modules produced by vite/dwc-vuetify-split.ts. Default export is a
// Record<name, Component> for iteration (global registration); named exports
// mirror the underlying vuetify/components names so `import { VCard } from
// "virtual:dwc-vuetify-core"` also works
declare module 'virtual:dwc-vuetify-core' {
  import type { Component } from 'vue'
  const components: Record<string, Component>
  export default components
}

declare module 'virtual:dwc-vuetify-extras' {
  import type { Component } from 'vue'
  const components: Record<string, Component>
  export default components
}

// Virtual module produced by vite/dwc-components.ts. Default export is a
// Record<PascalCaseName, Component> covering every .vue file under
// src/components/. Loaded lazily on first external plugin load
declare module 'virtual:dwc-components' {
  import type { Component } from 'vue'
  const components: Record<string, Component>
  export default components
}

// Build datetime in "YYYY-MM-DD HH:MM" form, injected by vite.config.mts at build time
declare const __BUILD_DATETIME__: string
