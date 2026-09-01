// Plugins
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Fonts from 'unplugin-fonts/vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'
import dwcPlugins from './vite/dwc-plugins.ts'
import dwcVuetifySplit from './vite/dwc-vuetify-split.ts'
import dwcComponents from './vite/dwc-components.ts'
import dwcPluginApi from './vite/dwc-plugin-api.ts'
import buildOutputs from './vite/build-outputs.ts'

// Utilities
import { defineConfig, type Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

// Ship sourcemaps for prerelease builds (alpha/beta/rc) so we can debug installs in the wild.
// Stable releases build them in hidden mode instead: the bundles carry no sourceMappingURL, so
// browsers never request the maps and the SD-card and DSF zips stay lean, but the maps are still
// emitted and packaged into srcmaps.zip for offline stack trace lookups.
// DWC_SOURCEMAP=1 / =hidden / =0 forces either way, e.g. when probing a stable build locally
const dwcPackage = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"))
const isPrerelease = /-(?:alpha|beta|rc)\b/i.test(dwcPackage.version as string)
const sourcemapMode = process.env.DWC_SOURCEMAP
const requestedSourcemap: boolean | "hidden" = (sourcemapMode === undefined) ? (isPrerelease ? true : "hidden") : (sourcemapMode === "hidden") ? "hidden" : sourcemapMode !== "0"

// A renamed productName means this is one of the authorized OEM forks. Their stable builds run on
// customer machines we have no access to, so they always keep at least hidden maps - turning maps
// off entirely would leave a fork's field errors undecodable
const sourcemap = (requestedSourcemap === false && dwcPackage.productName !== "DuetWebControl") ? "hidden" : requestedSourcemap

// Build datetime in local time, "YYYY-MM-DD HH:MM" (no seconds) - injected via `define` below
// and surfaced in Settings -> Infrastructure next to the DSF build datetime
const buildDateTime = (() => {
	const d = new Date()
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})()

// Monaco emits css/html/json/ts language workers eagerly, but `getWorker` in src/utils/monaco.ts
// always returns the editor worker - we never spin up a language service. Drop the dead worker
// assets from the bundle so they don't get gzipped / zipped / shipped. URL references in the
// monaco chunk become 404s if anything ever requests them; our code path never does
function dwcStripMonacoLangWorkers(): Plugin {
	return {
		name: "dwc-strip-monaco-lang-workers",
		apply: "build",
		generateBundle(_options, bundle) {
			for (const name of Object.keys(bundle)) {
				if (/(?:^|\/)(?:json|css|html|ts)\.worker(?:-[A-Za-z0-9_-]+)?\.js$/.test(name)) {
					delete bundle[name];
				}
			}
		},
	};
}

// https://vitejs.dev/config/
export default defineConfig({
  build: {
		chunkSizeWarningLimit: 5000000,
		sourcemap,
		// Skip vite's modulepreload polyfill - it inflates the entry chunk with browser-shim
		// code we don't need (every browser we ship to supports <link rel="modulepreload">)
		modulePreload: { polyfill: false },
		rollupOptions: {
			checks: { pluginTimings: false },
			input: {
				app: fileURLToPath(new URL('./index.html', import.meta.url)),
			},
			output: {
				chunkFileNames: "js/[name]-[hash].js",
				entryFileNames: "js/[name]-[hash].js",

				assetFileNames: ({ name }) => {
					if (name) {
						if (/\.css$/.test(name)) {
							return "css/[name]-[hash][extname]";
						}
						if (/\.(eot|woff|woff2|ttf)$/.test(name)) {
							return "fonts/[name]-[hash][extname]";
						}
						if (/\.(gif|jpe?g|png|svg)$/.test(name)) {
							return "img/[name]-[hash][extname]";
						}
						// Monaco emits its language workers as assets (not chunks) - keep
						// them under js/ so all JS lives in one folder
						if (/\.js$/.test(name)) {
							return "js/[name]-[hash][extname]";
						}
					}

					// default value
					// ref: https://rollupjs.org/guide/en/#outputassetfilenames
					return "assets/[name]-[hash][extname]";
				},
				// Everything that's DWC core source (anything under src/ that isn't a built-in
				// plugin) goes into a single `app` chunk - one network request for the whole
				// app on the embedded Duet's ~8-socket HTTP server. Built-in plugins stay
				// as per-plugin async chunks since they're opt-in. node_modules deps land in
				// rollup's default per-package chunks, except babylon/monaco/vuetify, where
				// we force a single named chunk to avoid per-file waterfalls
				manualChunks: (id) => {
					if (id.includes("node_modules/monaco-editor-core/")
						|| id.includes("node_modules/@duet3d/monacotokens/")
						|| id.endsWith("/src/utils/monaco-init.ts")) {
						return "monaco";
					}
					if (id.includes("node_modules/@babylonjs/")
						|| id.includes("node_modules/babylonjs-gltf2interface/")) {
						return "babylon";
					}
					// @duet3d/gcodeviewer bundles its own Babylon + inlined render worker into a single
					// ~6 MB ESM file, so it needs no shared-dep grouping - let it fall through to its own
					// lazy chunk, fetched as one request when the GCodeViewer plugin opens

					if (id === "\0virtual:dwc-vuetify-extras"
						|| id.includes("node_modules/vuetify/")) {
						return "vuetify";
					}
					// virtual:dwc-components is DWC's own component re-export wrapper - lump it
					// into app so it doesn't ship as its own ~1.5 kB chunk
					if (id === "\0virtual:dwc-components") {
						return "app";
					}
					// Anything in our src/ except the built-in plugin subdirectories lands in
					// app. Exclude node_modules so a package shipping its own src/ doesn't
					// get pulled in by mistake
					if (!id.includes("/node_modules/")) {
						const srcMatch = id.match(/\/src\/(.+)$/);
						if (srcMatch && !/^plugins\/[^/]+\//.test(srcMatch[1])) {
							return "app";
						}
					}
				}
			}
		}
	},
	// Worker bundles (Monaco's editor.worker plus the unused language workers it eagerly
	// references) go through a separate rollup pass with its own naming. Land them under
	// js/ so all JS lives in one folder
	worker: {
		rollupOptions: {
			output: {
				assetFileNames: "js/[name]-[hash][extname]",
				chunkFileNames: "js/[name]-[hash].js",
				entryFileNames: "js/[name]-[hash].js",
			}
		}
	},
	// Vite's default crawl follows static imports from index.html only, so anything first
	// reached across a dynamic-import boundary (auto-routed pages, plugin entries,
	// `await import("jszip")`, the prefetched Babylon chunk, monaco-init.ts) is discovered
	// lazily - which keeps producing "new dependencies optimized: ... reloading" mid-session.
	// Pointing entries at the source tree forces every .ts/.vue file to be scanned during the
	// initial prebundle pass, so transitive deps (deep babylonjs subpaths, vuetify labs
	// components, date-fns locales, jszip, monaco-editor-core subpaths, etc.) land in the
	// prebundle up front - no explicit `include` list needed
	optimizeDeps: {
		entries: [
			"index.html",
			"src/**/*.{ts,vue}"
		]
	},
  plugins: [
    dwcPlugins(),
    dwcVuetifySplit(),
    dwcComponents(),
    dwcPluginApi(),
    VueRouter({
      dts: 'src/typed-router.d.ts',
    }),
    // `builtin.vue` is the built-in fallback shell, statically imported by `default.vue`. Exclude
    // it from the auto-scan since it's not a route-meta layout - otherwise it would also be emitted
    // as a dynamic import in the generated layouts module, which clashes with the static import in
    // `default.vue` (Vite's INEFFECTIVE_DYNAMIC_IMPORT warning). `importMode: () => "async"` is
    // required to break a circular-import TDZ on the generated `layouts` const: with the default
    // mode the plugin emits `import __layout_0 from "/src/layouts/default.vue"` at the top of the
    // virtual module, and `default.vue`'s transitive imports cycle back into the virtual module
    // (via `@/plugins/layout -> @/router -> virtual:generated-layouts`), so `setupLayouts` is
    // reachable before the `export const layouts = {...}` line has run. Async imports turn
    // `default.vue` into `() => import(...)`, removing it from the static dep graph
    Layouts({
      exclude: ['**/builtin.vue'],
      importMode: () => 'async',
    }),
    // unplugin-auto-import + unplugin-vue-components: a deliberate convenience kept for now;
    // post-completion cleanup candidate - revisit dropping them once the port is done
    AutoImport({
      imports: [
        'vue',
        {
          'vue-router': ['useRoute', 'useRouter'],
        },
      ],
      dts: 'src/auto-imports.d.ts',
      vueTemplate: true,
    }),
    Components({
      dts: 'src/components.d.ts',
    }),
    Vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      // Per-file auto-import is redundant with the global registration done in
      // src/plugins/index.ts via virtual:dwc-vuetify-core. With autoImport on,
      // every .vue file pulls its vuetify components into its own chunk, which
      // forces rollup to extract shared vuetify chunks. Off keeps vuetify code
      // entirely in the entry chunk (matches v3.7-dev's bundling-into-app)
      autoImport: false,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    Fonts({
      fontsource: {
        families: [{
          name: 'Roboto',
          weights: [100, 300, 400, 500, 700, 900],
          styles: ['normal', 'italic'],
        }],
      },
    }),
    dwcStripMonacoLangWorkers(),
    // Service worker. Filename matches v3.7-dev's URL so kiosks already running an old DWC
    // pick up this build as a regular SW update (skipWaiting + clientsClaim + cleanupOutdatedCaches
    // then take over and reload). Manifest is off - DWC isn't an installable PWA, we only want
    // the caching layer. Registration is done manually from src/registerServiceWorker.ts so we
    // can reload on controllerchange instead of leaving the page on stale precached chunks
    VitePWA({
      injectRegister: false,
      filename: 'service-worker.js',
      manifest: false,
      workbox: {
        // Workbox emits its own maps with a sourceMappingURL comment, which would 404 once the
        // maps are held back - tie them to the shipped-sourcemaps case
        sourcemap: sourcemap === true,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 20_000_000,
        // Precache only the initial app shell. babylon/monaco/per-plugin chunks are fetched
        // on demand and cached via the runtime rule below
        globPatterns: [
          'index.html',
          'favicon.ico',
          'js/app-*.js',
          'js/vuetify-*.js',
          'css/app-*.css',
          'css/vuetify-*.css',
          'fonts/**/*',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/(js|css)\/(?!(app|vuetify)-)[^/]+\.(js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lazy-chunks',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
    buildOutputs(),
  ],
  define: {
    'process.env': {},
    __BUILD_DATETIME__: JSON.stringify(buildDateTime),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 3000,
  },
})
