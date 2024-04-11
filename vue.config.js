const AutoImportsPlugin = require("./webpack/lib/auto-imports-plugin.js");
const CustomImportsPlugin = require("./webpack/lib/custom-imports-plugin.js");
const CompressionPlugin = require("compression-webpack-plugin");
const fs = require("fs"), path = require("path");
const { EnvironmentPlugin, ProvidePlugin } = require("webpack");
const EventHooksPlugin = require("event-hooks-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

module.exports = {
	configureWebpack: {
		devtool: "source-map",
		optimization: {
			chunkIds: "named",
			concatenateModules: false,
			flagIncludedChunks: false,
			mergeDuplicateChunks: false,
			moduleIds: "named",
			removeAvailableModules: false,
			splitChunks: {
				cacheGroups: {
					monacoEditor: {
						test: /[\\/]node_modules[\\/]monaco-editor/,
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
			// Work around for Buffer is undefined:
			// https://github.com/webpack/changelog-v5/issues/10
			new ProvidePlugin({
				Buffer: ["buffer", "Buffer"],
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
				new CompressionPlugin({
					exclude: /\.zip$/,
					minRatio: Infinity
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
		config.optimization.minimizer("terser").tap(args => {
			const { terserOptions } = args[0];
			terserOptions.keep_classnames = true;
			terserOptions.keep_fnames = true;
			return args;
		});
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
	},
	transpileDependencies: [
		"vuetify"
	]
}
