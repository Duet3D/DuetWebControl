// Plugins
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Fonts from 'unplugin-fonts/vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import dwcPlugins from './vite/dwc-plugins'
import buildOutputs from './vite/build-outputs'

// Utilities
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
		chunkSizeWarningLimit: 5000000,
		rollupOptions: {
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
					}
					
					// default value
					// ref: https://rollupjs.org/guide/en/#outputassetfilenames
					return "assets/[name]-[hash][extname]";
				},
				// Force heavy multi-file libraries into single named chunks. The standalone
				// Duet's embedded HTTP server only handles ~8 concurrent sockets, so the
				// default Rollup splitting (~200 chunks once Babylon + Monaco land) would
				// stall first-load of any page that touches them. Bundling Vuetify into
				// one chunk avoids a 20+ chunk waterfall on every page; the framework
				// code is shared anyway so total bytes stay roughly the same
				manualChunks: (id) => {
					if (id.includes("node_modules/monaco-editor/") || id.includes("/monaco/")) {
						return "monaco";
					}
					if (id.includes("node_modules/@babylonjs/")
						|| id.includes("node_modules/@sindarius/gcodeviewer/")) {
						return "babylon";
					}
					if (id.includes("node_modules/chart.js/")
						|| id.includes("node_modules/chartjs-adapter-date-fns/")) {
						return "chart";
					}
					if (id.includes("node_modules/vuetify/")) {
						return "vuetify";
					}
					if (id.includes("node_modules/vue/")
						|| id.includes("node_modules/@vue/")
						|| id.includes("node_modules/vue-router/")
						|| id.includes("node_modules/vue-i18n/")
						|| id.includes("node_modules/@intlify/")
						|| id.includes("node_modules/pinia/")) {
						return "vendor";
					}
				}
			}
		}
	},
  plugins: [
    dwcPlugins(),
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
      autoImport: true,
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
