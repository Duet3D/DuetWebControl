// Plugins
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Fonts from 'unplugin-fonts/vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import dwcPlugins from './vite/dwc-plugins'
import dwcVuetifySplit from './vite/dwc-vuetify-split'
import dwcComponents from './vite/dwc-components'
import buildOutputs from './vite/build-outputs'

// Utilities
import { defineConfig, type Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

// Ship sourcemaps for prerelease builds (alpha/beta/rc) so we can debug installs in the wild.
// Stable releases skip them to keep the SD-card and DSF zips lean. DWC_SOURCEMAP=1 / =0 forces
// either way, e.g. when probing a stable build locally
const dwcVersion = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version as string
const isPrerelease = /-(?:alpha|beta|rc)\b/i.test(dwcVersion)
const sourcemap = process.env.DWC_SOURCEMAP !== undefined ? process.env.DWC_SOURCEMAP !== "0" : isPrerelease

// monaco-init.ts and monaco-worker.ts statically import ~30 deep monaco-editor-core subpaths
// (editor.api.js, the contribs, the worker boot). Vite's dep optimizer only scans bare package
// specifiers, so it discovers each deep subpath lazily when the monaco chunk first loads - which
// triggers a re-optimize and a full-page reload mid-session. Parse the exact subpath list out of
// those two files and feed it into optimizeDeps.include so they get pre-bundled up front. Parsing
// instead of hard-coding keeps a single source of truth: adding a contrib stays a one-line edit
const monacoEntrySources = ["./src/utils/monaco-init.ts", "./src/utils/monaco-worker.ts"]
	.map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
	.join("\n")
const monacoSubpaths = [...new Set(
	[...monacoEntrySources.matchAll(/"(monaco-editor-core\/[^"]+)"/g)].map((match) => match[1])
)]

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
						|| id.includes("node_modules/babylonjs-gltf2interface/")
						|| id.includes("node_modules/@sindarius/gcodeviewer/")) {
						return "babylon";
					}
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
	// Pre-bundle the heavy dependencies that otherwise only get discovered when their lazy
	// plugin/editor chunk is first requested - that late discovery triggers a dep re-optimize
	// and a full-page reload mid-session. Listing them here bundles them up front
	optimizeDeps: {
		include: [
			"@babylonjs/core",
			"@babylonjs/gui",
			"@babylonjs/materials",
			"@sindarius/gcodeviewer",
			...monacoSubpaths,
			"@duet3d/motionanalysis",
			"chart.js",
			"chartjs-adapter-date-fns",
			"d3",
			"qoijs",
			"piecon"
		]
	},
  plugins: [
    dwcPlugins(),
    dwcVuetifySplit(),
    dwcComponents(),
    VueRouter({
      dts: 'src/typed-router.d.ts',
    }),
    Layouts(),
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
    buildOutputs(),
  ],
  define: { 'process.env': {} },
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
