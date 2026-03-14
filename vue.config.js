const AutoImportsPlugin = require("./webpack/lib/auto-imports-plugin.js");
const CustomImportsPlugin = require("./webpack/lib/custom-imports-plugin.js");
const { EsbuildPlugin } = require("esbuild-loader");
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const { EnvironmentPlugin } = require("webpack");
const EventHooksPlugin = require("event-hooks-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

module.exports = {
	configureWebpack: {
		devtool: process.env.NODE_ENV === "production" ? "source-map" : "eval-source-map",
		cache: {
			type: "filesystem",
			buildDependencies: {
				config: [__filename]
			}
		},
		optimization: {
			chunkIds: "named",
			concatenateModules: false,
			flagIncludedChunks: false,
			mergeDuplicateChunks: false,
			moduleIds: "named",
			removeAvailableModules: false,
			splitChunks: {
				cacheGroups: {
					babylon: {
						test: /[\\/]node_modules[\\/](@babylonjs|babylon|babylonjs-gltf2interface)[\\/]/,
						name: "babylon",
						chunks: "all"
					},
					monacoEditor: {
						test: (module) => module.context && /[\\/]node_modules[\\/]monaco-editor[\\/]/.test(module.context),
						name: "monaco-editor",
						chunks: "all"
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

						// Gzip all files in dist (except .zip files)
						const distDir = path.resolve(__dirname, "dist");
						function gzipDir(dir) {
							for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
								const fullPath = path.join(dir, entry.name);
								if (entry.isDirectory()) {
									gzipDir(fullPath);
								} else if (!entry.name.endsWith(".zip") && !entry.name.endsWith(".gz")) {
									const content = fs.readFileSync(fullPath);
									const compressed = zlib.gzipSync(content, { level: 6 });
									fs.writeFileSync(fullPath + ".gz", compressed);
								}
							}
						}
						gzipDir(distDir);
					}
				}),
				...((process.env.NOZIP) ? [] : [
					new ZipPlugin({
						filename: "DuetWebControl-SD.zip",
						include: [/\.gz$/, /\.woff$/, /\.woff2$/],
						exclude: ["robots.txt"]
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
			keepNames: true,
			target: "es2015",
			css: true
		}]);
		config.optimization.set("splitChunks", {
			chunks: "all",
			cacheGroups: {
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
			maximumFileSizeToCacheInBytes: 20000000		// 20MB
		}
	}
}
