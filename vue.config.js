const AutoImportsPlugin = require("./webpack/lib/auto-imports-plugin.js");
const CustomImportsPlugin = require("./webpack/lib/custom-imports-plugin.js");
const { EsbuildPlugin } = require("esbuild-loader");
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const { Compilation, EnvironmentPlugin } = require("webpack");
const EventHooksPlugin = require("event-hooks-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

module.exports = {
	configureWebpack: {
		devtool: process.env.NODE_ENV === "production" ? "source-map" : "eval-source-map",
		cache: {
			type: "filesystem",
			buildDependencies: {
				config: [
					__filename,
					path.resolve(__dirname, "webpack/lib/auto-imports-plugin.js"),
					path.resolve(__dirname, "webpack/lib/custom-imports-plugin.js")
				]
			}
		},
		optimization: {
			chunkIds: "named",
			concatenateModules: false,
			flagIncludedChunks: false,
			mergeDuplicateChunks: true,
			moduleIds: "named",
			removeAvailableModules: false,
			splitChunks: {
				cacheGroups: {
					babylon: {
						test: /[\\/]node_modules[\\/](@babylonjs|babylon|babylonjs-gltf2interface)[\\/]/,
						name: "babylon",
						chunks: "async"
					}
				}
			},
			usedExports: false
		},
		performance: {
			hints: false
		},
		plugins: [
			new AutoImportsPlugin(),
			new EnvironmentPlugin({
				"BUILD_DATETIME": (new Date()).toString()
			}),
			...((process.env.NODE_ENV === "production") ? [
				new CustomImportsPlugin(),
				new EventHooksPlugin({
					beforeCompile() {
						const apiDocs = path.resolve(__dirname, "./DuetAPI.xml")
						if (fs.existsSync(apiDocs)) {
							fs.copyFileSync(apiDocs, path.resolve(__dirname, "./public/DuetAPI.xml"));
						} else {
							const dsfApiDocs = path.resolve(__dirname, "../DuetSoftwareFramework/src/DuetAPI/DuetAPI.xml");
							if (fs.existsSync(dsfApiDocs)) {
								fs.copyFileSync(dsfApiDocs, path.resolve(__dirname, "./public/DuetAPI.xml"));
							}
						}
					},
					afterEmit() {
						const apiDocs = path.resolve(__dirname, "./public/DuetAPI.xml");
						if(fs.existsSync(apiDocs)) {
							fs.unlinkSync(apiDocs);
						}
					}
				}),
				// Add gzipped versions of every asset into compilation.assets so
				// ZipPlugin (which runs at PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER)
				// can include them in DuetWebControl-SD.zip
				{
					apply(compiler) {
						compiler.hooks.thisCompilation.tap("GzipAssetsPlugin", (compilation) => {
							compilation.hooks.processAssets.tap(
								{
									name: "GzipAssetsPlugin",
									// Must run after HtmlWebpackPlugin (stage 1000) but before
									// ZipPlugin (PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER = 3000)
									stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER - 1
								},
								(assets) => {
									for (const [name, asset] of Object.entries(assets)) {
										if (name.endsWith(".gz") || name.endsWith(".zip")) continue;
										const content = asset.source();
										const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
										const compressed = zlib.gzipSync(buf, { level: 6 });
										compilation.emitAsset(name + ".gz", new compiler.webpack.sources.RawSource(compressed));
									}
								}
							);
						});
					}
				},
				...((process.env.NOZIP) ? [] : [
					new ZipPlugin({
						filename: "DuetWebControl-SD.zip",
						include: [/\.gz$/, /\.woff$/, /\.woff2$/],
						exclude: [/robots\.txt/]
					}),
					new ZipPlugin({
						filename: "DuetWebControl-SBC.zip",
						exclude: [/\.gz$/, /\.zip$/]
					})
				])
			] : [])
		],
		resolve: {
			extensions: [".ts", ".js"]
		}
	},
	chainWebpack: config => {
		config.optimization.minimizers.delete("terser");
		config.optimization.minimizer("esbuild").use(EsbuildPlugin, [{
			target: "es2020",
			css: true
		}]);
		// Extract the webpack runtime into its own chunk so the entry chunk
		// uses the same `webpackChunk.push(...)` form as lazy chunks. Without
		// this, webpack wraps the entry in an IIFE and never emits a per-module
		// source map for it, making @duet3d/* and other deps un-debuggable.
		config.optimization.runtimeChunk("single");
		config.optimization.set("splitChunks", {
			chunks: "all",
			cacheGroups: {
				// Pull the wrapper, all of monaco-editor (including its internal dynamic language/feature imports) and
				// @duet3d/monacotokens into one "monaco" chunk - otherwise every nested async import becomes its own tiny file
				monaco: {
					test: /[\\/]node_modules[\\/](monaco-editor|@duet3d[\\/]monacotokens)[\\/]|[\\/]src[\\/]utils[\\/]monaco\.ts$/,
					name: "monaco",
					chunks: "async",
					enforce: true,
					priority: 10
				},
				defaultVendors: false,
				default: false
			}
		});
		config.plugins.delete("prefetch");
		config.plugins.delete("hash-module-ids");
	},
	pwa: {
		name: "Duet Web Control",
		themeColor: "#2196f3",
		appleMobileWebAppCapable: "yes",
		appleMobileWebAppStatusBarStyle: "black",
		workboxOptions: {
			maximumFileSizeToCacheInBytes: 20000000,	// 20MB
			// Exclude all lazy chunks from eager precaching (only app.* is initial)
			exclude: [
				({ url }) => /\/(js|css)\/(?!app\.)/.test(url)
			],
			runtimeCaching: [
				{
					// Cache all lazy JS/CSS chunks on first use (cache-first, long TTL)
					urlPattern: /\/(js|css)\/(?!app\.)[^/]+\.(js|css)(\.gz)?$/,
					handler: "CacheFirst",
					options: {
						cacheName: "lazy-chunks",
						expiration: {
							maxEntries: 60,
							maxAgeSeconds: 30 * 24 * 60 * 60	// 30 days
						}
					}
				}
			]
		}
	}
}
